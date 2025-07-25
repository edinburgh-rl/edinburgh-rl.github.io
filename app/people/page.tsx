import PageLayout from "@/components/PageLayout";
import PersonCard from "@/components/PersonCard";
import { getFrontMatterData } from "@/lib/parse-front-matter";
import { groupByType, PeopleFrontMatter } from "@/lib/people-data-utils";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "People | MARBLE",
  description: "Current and past memebers of MARBLE",
};

async function getData() {
    return groupByType(getFrontMatterData('data/people') as PeopleFrontMatter[]);
}

export default async function People() {
    const data = await getData();
    return (
        <PageLayout>
            {data.map((type) => (
                <section key={type.type} className="section p-5">
                    <h1>{type.type}</h1>
                    <div className="content is-flex is-flex-wrap-wrap is-flex-direction-row">
                        {type.people.map((person) => (
                            <PersonCard key={person.name} person={person} />
                        ))}
                    </div>
                </section>
            ))}
            <section className="section p-5">
                <p><i>* NLP = Natural Language Processing; CDT = Centre for Doctoral Training; CMU = Carnegie Mellon University</i></p>
            </section>
        </PageLayout>
    );
}