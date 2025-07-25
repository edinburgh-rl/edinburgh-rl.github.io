import { PeopleFrontMatter } from "@/lib/people-data-utils";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouseChimney } from "@fortawesome/free-solid-svg-icons";
import { faXTwitter, faBluesky, faLinkedin, faGithub } from "@fortawesome/free-brands-svg-icons";
import Image from "next/image";

export default function PersonCard({ person }: { person: PeopleFrontMatter }) {
    return (
        <div className="card m-2" style={{
            width: '400px',
        }}>
            <div className="card-content is-flex is-flex-direction-row p-3">
                <div className="is-flex-grow-0 is-flex-shrink-0">
                    <Image className="member-photo" src={`photos/people/${person.photoUrl}`} width={128} height={128} alt="Person photo"/>
                </div>
                <div className="is-flex-grow-1 is-flex-wrap-wrap">
                    <section className="section p-1 pl-2">
                        <h4 className="title is-4">{person.name}</h4>
                        <p className="subtitle is-5">{person.occupation}</p>
                    </section>
                </div>
            </div>
            <footer className="card-footer is-size-4">
                {person.website !== undefined ? (
                    <a href={person.website} title="Personal Webpage" className="card-footer-item social-media-link"><FontAwesomeIcon icon={faHouseChimney} /></a>
                ) : (<></>)}
                {person.github !== undefined ? (
                    <a href={person.github} title="Github" className="card-footer-item social-media-link"><FontAwesomeIcon icon={faGithub} /></a>
                ) : (<></>)}
                {person.x !== undefined ? (
                    <a href={person.x} title="X/Twitter" className="card-footer-item social-media-link"><FontAwesomeIcon icon={faXTwitter} /></a>
                ) : (<></>)}
                {person.bluesky !== undefined ? (
                    <a href={person.bluesky} title="Bluesky" className="card-footer-item social-media-link"><FontAwesomeIcon icon={faBluesky} /></a>
                ) : (<></>)}
                {person.linkedin !== undefined ? (
                    <a href={person.linkedin} title="LinkedIn" className="card-footer-item social-media-link" ><FontAwesomeIcon icon={faLinkedin} /></a>
                ) : (<></>)}
            </footer>
        </div>
    )
}