import PageLayout from "@/components/PageLayout";
import { BlogFrontMatter, getBlogArticleData, BlogArticle } from "@/lib/blog-utils";
import { getFrontMatterData } from "@/lib/parse-front-matter";
import { Metadata } from "next";
import { MDXRemote, MDXRemoteOptions } from "next-mdx-remote-client/rsc";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import '@/public/styles/a11y-dark.css'
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { h } from 'hastscript';
import { Centered } from "@/components/blog/Centered";
import WithCaption from "@/components/blog/WithCaption";

export async function generateStaticParams() {
  const posts = getFrontMatterData('data/blog') as BlogFrontMatter[];
 
  return posts.map((post) => ({
    slug: post.id,
  }))
}

async function getData(filename: string) {
    return getBlogArticleData(`data/blog/${filename}.mdx`) as BlogArticle;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }>}): Promise<Metadata> {
    const data = await getData((await params).slug);

    if(!data) {
        return {
            title: "Article not found",
            description: "This article cannot be found"
        }
    }

    return {
        title: `${data.frontMatter.title} | MARBLE`,
        authors: [{ name: data.frontMatter.author }],
        description: data.frontMatter.description ?? '',
        keywords: data.frontMatter.keywords ?? ''
    }
}

export default async function Article({ params }: { params: Promise<{ slug: string }>}) {
    const data = await getData((await params).slug);
    const options: MDXRemoteOptions = {
        mdxOptions: {
            remarkPlugins: [remarkMath, remarkGfm],
            rehypePlugins: [
                rehypeKatex, 
                rehypeHighlight, 
                rehypeSlug, 
                [rehypeAutolinkHeadings, {
                    content: () => h('span.blog-articles-link', {}, '#')
                }]
            ]
        }
    }

    const components = {Centered, WithCaption};


    return (
        <PageLayout>
            <section className="p-5">
                <h1 className="title is-2"><i>{data.frontMatter.title}</i></h1>
                <div className="columns">
                    <div className="column is-size-5">Author: <b>{data.frontMatter.author}</b></div>
                    <div className="column is-size-5">Published: <b>{data.frontMatter.date}</b></div>
                </div>
            </section>
            <section className="p-5">
                <MDXRemote source={data.content} options={options} components={components}/>
            </section>
        </PageLayout>
    );
}