<?php

use App\Services\ExternalApiService;

/**
 * Regression test for the Range-emulation fallback in ExternalFileDownloader.
 *
 * Some origins ignore the Range header entirely and always answer with a full
 * 200 response. Relaying that verbatim confused browsers into repeatedly
 * aborting an in-flight full-file download every time the user seeked forward
 * ("The fetching process for the media resource was aborted by the user
 * agent"), since playback never had time to complete. This origin
 * deliberately never honors Range, forcing the proxy's fallback path: it must
 * fabricate a real 206 with the correct slice instead of relaying the origin's
 * 200.
 */
beforeEach(function () {
    $this->fixturesDir = sys_get_temp_dir().'/rsui-range-emulation-test-'.uniqid();
    mkdir($this->fixturesDir);

    $this->fileContents = 'abcdefghijklmnopqrstuvwxyz0123456789';
    file_put_contents($this->fixturesDir.'/sample.bin', $this->fileContents);

    // Always returns the whole file with 200, regardless of any Range header.
    file_put_contents($this->fixturesDir.'/router.php', <<<'PHP'
        <?php
        $content = file_get_contents(__DIR__.'/sample.bin');
        header('Content-Type: application/octet-stream');
        header('Content-Length: '.strlen($content));
        http_response_code(200);
        echo $content;
        PHP);

    $this->port = random_int(20000, 60000);

    $descriptorSpec = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $this->serverProcess = proc_open(
        sprintf('php -S 127.0.0.1:%d %s', $this->port, escapeshellarg($this->fixturesDir.'/router.php')),
        $descriptorSpec,
        $this->serverPipes,
        $this->fixturesDir,
    );

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

function captureEmulatedStreamedBody($response): string
{
    ob_start();
    ob_start();
    $response->sendContent();
    ob_end_flush();

    return ob_get_clean();
}

test('a fabricated 206 is served with the correct slice when the origin ignores Range', function () {
    $response = (new ExternalApiService)->downloadFile('sample.bin', 'bytes=5-9');

    $body = captureEmulatedStreamedBody($response);

    // The status/headers are set via raw header()/http_response_code() calls
    // (see ExternalFileDownloader) rather than on the Response object itself, so
    // http_response_code() as a getter is what actually reflects what curl
    // determined, not $response->getStatusCode().
    expect(http_response_code())->toBe(206);
    expect($body)->toBe(substr($this->fileContents, 5, 5));
});

test('an open-ended Range is fabricated through to the end of the file', function () {
    $response = (new ExternalApiService)->downloadFile('sample.bin', 'bytes=10-');

    $body = captureEmulatedStreamedBody($response);

    expect(http_response_code())->toBe(206);
    expect($body)->toBe(substr($this->fileContents, 10));
});
