import { BlogFrontMatter } from "@/lib/blog-utils";
import Link from "next/link";

export default function ArticleCard({ article }: { article: BlogFrontMatter }) {
    return (
        <div className="card blog-article-card">
            <div className="card-image">
                <figure className="image is-16by9">
                    <img
                        src={article.picture ? article.picture : "images/blog/default.png"}
                        alt="Article image"
                    />
                </figure>
            </div>
            <div className="card-content p-3">
                <p className="title is-4"><Link className="blog-articles-link" href={`/blog/${article.id}`}>{article.title}</Link></p>
                <p className="is-size-5 m-0">{article.author}</p>
                <p><i>{article.date}</i></p>
            </div>
        </div>
    )
}