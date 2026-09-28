<?php

use App\Services\ExternalApiService;

/**
 * End-to-end regression test for ExternalFileDownloader's byte-range proxying.
 *
 * A tiny local PHP server stands in for the external RS API and manually
 * implements HTTP Range semantics (206 partial content), so this exercises the
 * real curl request/response path instead of mocking it away. Without Range
 * support, <audio>/<video> elements can't seek without re-downloading the
 * whole file from byte 0, which was the root cause of the "slow" streaming
 * complaints this test guards against regressing.
 */
beforeEach(function () {
    $this->fixturesDir = sys_get_temp_dir().'/rsui-range-test-'.uniqid();
    mkdir($this->fixturesDir);

    $this->fileContents = 'abcdefghijklmnopqrstuvwxyz0123456789';
    file_put_contents($this->fixturesDir.'/sample.bin', $this->fileContents);

    file_put_contents($this->fixturesDir.'/router.php', <<<'PHP'
        <?php
        $file = __DIR__.'/sample.bin';
        $content = file_get_contents($file);
        $len = strlen($content);
        $range = $_SERVER['HTTP_RANGE'] ?? null;

        header('Content-Type: application/octet-stream');
        header('Accept-Ranges: bytes');

        if ($range && preg_match('/bytes=(\d+)-(\d*)/', $range, $m)) {
            $start = (int) $m[1];
            $end = ($m[2] === '') ? $len - 1 : (int) $m[2];
            http_response_code(206);
            header("Content-Range: bytes {$start}-{$end}/{$len}");
            header('Content-Length: '.($end - $start + 1));
            echo substr($content, $start, $end - $start + 1);
        } else {
            http_response_code(200);
            header('Content-Length: '.$len);
            echo $content;
        }
        PHP);

    $this->port = random_int(20000, 60000);

    $descriptorSpec = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $this->serverProcess = proc_open(
        sprintf('php -S 127.0.0.1:%d %s', $this->port, escapeshellarg($this->fixturesDir.'/router.php')),
        $descriptorSpec,
        $this->serverPipes,
        $this->fixturesDir,
    );

    // Give the built-in server a moment to start accepting connections.
    $deadline = microtime(true) + 3;
    while (microtime(true) < $deadline) {
        $conn = @fsockopen('127.0.0.1', $this->port, $errno, $errstr, 0.1);
        if ($conn) {
            fclose($conn);
            break;
        }
        usleep(50_000);
    }

    config(['services.rs.v1.endpoint' => "http://127.0.0.1:{$this->port}"]);

    session([
        'external_auth_cookie' => 'test-cookie',
        'external_auth_expires' => now()->addHour()->timestamp,
    ]);
});

afterEach(function () {
    if (isset($this->serverProcess) && is_resource($this->serverProcess)) {
        proc_terminate($this->serverProcess);
        proc_close($this->serverProcess);
    }

    if (isset($this->fixturesDir) && is_dir($this->fixturesDir)) {
        @unlink($this->fixturesDir.'/sample.bin');
        @unlink($this->fixturesDir.'/router.php');
        @rmdir($this->fixturesDir);
    }
});

function captureStreamedBody($response): string
{
    // The production code intentionally calls ob_flush()/flush() per chunk so the
    // browser gets bytes immediately. That pushes data past a single ob_start()
    // straight to real stdout, so we nest a second buffer here purely to make the
    // streamed output capturable in this test.
    ob_start();
    ob_start();
    $response->sendContent();
    ob_end_flush();

    return ob_get_clean();
}

test('a Range request returns only the requested byte slice', function () {
    $response = (new ExternalApiService)->downloadFile('sample.bin', 'bytes=5-9');

    $body = captureStreamedBody($response);

    expect($body)->toBe(substr($this->fileContents, 5, 5));
});

test('no Range header returns the full file body', function () {
    $response = (new ExternalApiService)->downloadFile('sample.bin', null);

    $body = captureStreamedBody($response);

    expect($body)->toBe($this->fileContents);
});
