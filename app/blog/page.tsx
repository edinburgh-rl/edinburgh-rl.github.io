import ArticleCard from "@/components/ArticleCard";
import PageLayout from "@/components/PageLayout";
import { getBlogArticles, BlogFrontMatter } from "@/lib/blog-utils";
import { getFrontMatterData } from "@/lib/parse-front-matter";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blog | MARBLE",
    description: "Articles written by members of the MARBLE group",
    keywords: ["blog", "reinforcement learning", "RL", "MARL", "mutli-agent reinforcement learning", "multi-agent"]
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
                    {data.length > 0 ? data.map((x, idx) => (
                        <div key={idx} className="cell">
                            <ArticleCard article={x} />
                        </div>
                    )) : (
                        <p><i>There are currently no articles. Please check again later.</i></p>
                    )}
                </div>
            </section>


        </PageLayout>
    );
}