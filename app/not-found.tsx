import PageLayout from "@/components/PageLayout";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Error 404 | MARBLE",
  description: "Page not found"
};

export default function NotFound() {
    return (
        <PageLayout>
            <div className="hero is-white is-small">
                <div className="hero-body has-text-centered">
                    <div className="container">
                        <h1 className="title is-2">Error 404 | Page not found</h1>
                        <p className="subtitle is-5">It appears that this page never existed or the URL has changed.<br/><Link href={"/"}>&#x2190; Go to home page</Link></p>
                    </div>
                </div>
            </div>
        </PageLayout>
    )
}