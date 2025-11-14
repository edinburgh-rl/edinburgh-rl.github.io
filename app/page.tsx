import PageLayout from "@/components/PageLayout";
import Link from "next/link";
import styles from "./page.module.scss";
import { Metadata } from "next";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBluesky, faXTwitter, faYoutube } from "@fortawesome/free-brands-svg-icons";

export const metadata: Metadata = {
  title: "Home | MARBLE",
  description: "Multi-Agent, Reinforcement, Behavior and Learning (MARBLE) is an interest group based at the University of Edinburgh focused on topics like reinforcement learning, multi-agent reinforcement learning and behavior",
  keywords: ['edinburgh rl', 'edinburgh marl', 'RL', 'MARL', 'reinforcement learning', 'multi-agent reinforcement learning', 'interest group']
};

export default function Home() {
  return (
    <PageLayout>
      <div className={`hero is-medium ${styles['custom-hero-bg']}`}>
        <div className="hero-body">
          <div className="container">
            <h1 className="title">&#128075; Welcome to MARBLE</h1>
            <p className="subtitle is-5">Multi-Agent, Reinforcement, Behavior and Learning at Edinburgh</p>
          </div>
        </div>
      </div>
      <section className="section p-5">
        <h1 className="title">&#128214; About us</h1>
        <p>
          We are an interest group focused on Reinforcement Learning and Multi-Agent Reinforcement Learning, based at the University of Edinburgh.
          Formerly known as the Autonomous Agents Research Group, we hold regular reading group meetings where invited speakers present the latest
          developments in the field. You can learn more <Link href={"/reading-group"}>here</Link>.
        </p>
      </section>
      <section className="section p-5">
        <h1 className="title">☑️ Joining the group</h1>
        <p>
          Thank you for your interest in joining our group! Unfortunately, we are not accepting new members at this time. However, we may open applications again in 2026. Stay tuned!
        </p>
      </section>
      <section className="section p-5">
        <h1 className="title">&#127757; Find us on</h1>
        <div className="level has-text-centered is-size-1 has-text-primary is-mobile">
          <div className="level-item">
            <a className="social-media-link" href="https://x.com/rl_agents_rg"><FontAwesomeIcon icon={faXTwitter} /></a>
          </div>
          <div className="level-item">
            <a className="social-media-link" href="https://bsky.app/profile/rl-agents-rg.bsky.social"><FontAwesomeIcon icon={faBluesky} /></a>
          </div>
          <div className="level-item">
            <a className="social-media-link" href="https://www.youtube.com/@RL_And_Agents_Reading_Group"><FontAwesomeIcon icon={faYoutube} /></a>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}