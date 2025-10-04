import ArticleCard from "@/components/ArticleCard";
import PageLayout from "@/components/PageLayout";
import { getBlogArticles, BlogFrontMatter } from "@/lib/blog-utils";
import { getFrontMatterData } from "@/lib/parse-front-matter";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blog | MARBLE",
    description: "Articles written by members of the group",
};

async function getData() {
    return getBlogArticles(getFrontMatterData('data/blog') as BlogFrontMatter[]);
}

export default async function People() {
    const data = await getData();
    return (
        <PageLayout>
            <div className="hero is-white is-small">
                <div className="hero-body">
                    <div className="container">
                        <h1 className="title is-2">📖 Articles</h1>
                        <p className="subtitle is-5">List of articles written by members of our group</p>
                    </div>
                </div>
            </div>

            <section className="section p-5">

                <div className="grid is-col-min-12">
                    {data.map((x, idx) => (
                        <div key={idx} className="cell is-flex is-justify-content-center">
                            <ArticleCard article={x} />
                        </div>
                    ))}
                </div>
            </section>


        </PageLayout>
    );
}