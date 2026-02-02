import { type ViewerImage } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const { image } = usePage<{
        image: ViewerImage;
    }>().props;

    const showWelcomeImage = false;

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>
            <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
                <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
                    <main className="flex w-full max-w-[335px] flex-col-reverse lg:max-w-4xl lg:flex-row">
                        <div className="flex-1 rounded-br-lg rounded-bl-lg bg-white p-6 pb-12 text-[13px] leading-[20px] shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-tl-lg lg:rounded-br-none lg:p-20 dark:bg-[#161615] dark:text-[#EDEDEC] dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]">
                            <h1 className="mb-1 font-medium">R* Digital Preservation</h1>
                            <p className="mb-2 text-[#706f6c] dark:text-[#A1A09A]">
                                Primarily a service for faculty and librarians, Digital Preservation provides long-term archival storage, backup, and
                                a method for future retrieval.
                            </p>
                            <ul className="flex gap-3 text-sm leading-normal">
                                <li>
                                    <Link
                                        href={route('login')}
                                        className="inline-block rounded-sm border border-black bg-[#1b1b18] px-5 py-1.5 text-sm leading-normal text-white hover:border-black hover:bg-black dark:border-[#eeeeec] dark:bg-[#eeeeec] dark:text-[#1C1C1A] dark:hover:border-white dark:hover:bg-white"
                                    >
                                        Log in
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        {showWelcomeImage && (
                            <div className="relative -mb-px aspect-[335/376] w-full shrink-0 overflow-hidden rounded-t-lg bg-[#fff2f2] lg:mb-0 lg:-ml-px lg:aspect-auto lg:w-[438px] lg:rounded-t-none lg:rounded-r-lg dark:bg-[#1D0002]">
                                <img title={image.title} alt={image.alt} src={image.src} />
                                <div className="absolute inset-0 rounded-t-lg shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-t-none lg:rounded-r-lg dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]" />
                            </div>
                        )}
                    </main>
                </div>
                <div className="hidden h-14.5 lg:block"></div>
            </div>
        </>
    );
}
