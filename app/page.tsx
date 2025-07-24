import PageLayout from "@/components/PageLayout";
import Link from "next/link";
import styles from "./page.module.scss";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | MARBLE",
  description: "Multi-Agent, Reinforcement, Behavior and Learning at Edinburgh",
};

export default function Home() {
  return (
    <PageLayout>
      <div className="notification is-info is-light">
        📝 This website is currently under construction. If you are interested in the reading group, please visit <Link href={"/reading-group"}>our Reading Group page</Link>.
      </div>
      <section className={`hero is-medium ${styles['custom-hero-bg']}`}>
        <div className="hero-body">
          <p className="title">&#128075; Welcome to MARBLE</p>
          <p className="subtitle">Multi-Agent, Reinforcement, Behavior and Learning at Edinburgh</p>
        </div>
      </section>
      <section className="section p-5">
        <h1 className="title">&#128214; About us  </h1>
        <p>
          We are an interest group focused on Reinforcement Learning and Multi-Agent Reinforcement Learning, based at the University of Edinburgh.
          Formerly known as the Autonomous Agents Research Group, we hold regular reading group meetings where invited speakers present the latest
          developments in the field. You can learn more <Link href={"/reading-group"}>here</Link>.
        </p>
      </section>
    </PageLayout>
  );
}