
"use client";

import { useRouter } from "next/navigation";

export default function DedicatedPage() {
    const router = useRouter();

    return (
        <div className="container">
            <div className="card text-center">
                <h1 className="mb-md">Not all Heroes wear capes </h1>
                <p className="mb-lg">
                    They do love frogs however
                </p>
                <div className="frog-image-frame mb-lg" style={{ margin: "0 auto", padding: "0px", maxWidth: "300px", aspectRatio: "1/1" }}>
                    <img
                        src="/frogsyEasterEggg.png"
                        alt="The textually active Pain Level 2 Frog"
                        className="frog-image"
                    />
                </div>
                <div className="mb-lg" style={{ marginTop: "35px" }}>
                    <p className="mb-md">
                        This project is dedicated to my girlfriend.
                        You have been such an inspiration and have proven to me that even in the darkest of times, hope is always there.
                    </p>
                    <p className="mb-md">
                        Your strength and resilience are truly admirable and I know with your strength we will beat fibromyalgia!
                    </p>
                    <p className="mt-lg font-bold">
                        I love you!
                        <br />
                        ~Simon
                    </p>
                </div>
                <p className="mb-lg">

                    "Sometimes a little discomfort is just a hop away from discovery."
                </p>
                <button onClick={() => router.back()} className="btn-secondary">
                    Return to the Pond
                </button>
            </div>
        </div>
    );
}
