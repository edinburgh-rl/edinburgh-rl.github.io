import ObfuscatedEmail from "@/components/ObfuscatedEmail";
import PageLayout from "@/components/PageLayout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "UoE RL Reading Group",
  description: "University of Edinburgh Reinforcement Learning Reading Group",
};

export default function ReadingGroup() {
  return (
    <PageLayout>
      <div className="hero is-white is-small">
        <div className="hero-body">
          <div className="container">
            <h1 className="title is-2">🤖 RL & Agents Reading Group</h1>
            <p className="subtitle is-4">University of Edinburgh</p>
          </div>
        </div>
      </div>

      <section className="section p-5 has-text-justified">
        <h1 className="title">📅 Next Reading Group Session</h1>
        <p className="mb-1">
          <strong>Time and date:</strong> 3-4pm BST, Fri Sep 19, 2025
        </p>
        <p className="mb-1">
          <strong>Speakers:</strong> Olya Mastikhina and Dhruv Sreenivas
        </p>
        <p className="mb-1">
          <strong>Title:</strong> Optimistic critics can empower small actors
        </p>
        <p className="mb-1">
          <strong>Abstract:</strong><br />
          Actor-critic methods have been central to many of the recent advances in deep reinforcement learning. The most common approach is to use symmetric architectures, whereby  both actor and critic have the same network topology and number of parameters. How-ever, recent works have argued for the advantages of asymmetric setups, specifically with the use of smaller actors. We perform broad empirical investigations and analyses to better understand the implications of this and find that, in general, smaller actors result in performance degradation and overfit critics. Our analyses suggest poor data collection, due to value underestimation, as one of the main causes for this behavior,and further highlight the crucial role the critic can play in alleviating this pathology.We explore techniques to mitigate the observed value underestimation, which enables further research in asymmetric actor-critic methods.
        </p>
        <p className="mb-1">
          <strong>Links:</strong><br />
          <a
            href="https://arxiv.org/abs/2506.01016"
            target="_blank"
            rel="noopener noreferrer"
            className="has-text-link"
          >
            Paper
          </a>
        </p>
        <p className="mb-2">
          <strong>Bio:</strong><br />
          Olya Mastikhina and Dhruv Sreenivas are PhD students at University of Montreal and Mila - Quebec AI Institute, where they work with Pablo Samuel Castro. Olya’s research focuses on reinforcement learning (RL) and the study of agency, with a particular interest in how broader conceptions of agency can inform how we think about and design intelligent systems. Dhruv’s research focuses on sample-efficient, scalable RL, particularly on how to design and scale RL and imitation learning algorithms to complex control tasks using representation learning, exploration and new model architectures.
        </p>
      </section>

      <section className="section p-5 has-text-justified">
        <h1 className="title">About Our Reading Group</h1>
        <p className="mb-4">
          We organise regular meetings to discuss recent papers in Reinforcement Learning (RL), Multi-Agent RL and related areas (open-ended learning, LLM agents, robotics, etc). Meetings take place online and are open to everyone. Participants are expected to read the paper prior to the meeting.
        </p>
        <p className="is-size-7 has-text-grey">
          <em>We were previously known as the Autonomous Agents Reading Group.</em>
        </p>
      </section>

      <section className="section p-5 has-text-justified">
        <h1 className="title">Participate</h1>
        <p>
          📝 <strong>Sign up:</strong> <a href="https://forms.gle/anHVSi97d6F6M37R6" className="has-text-link">Join our mailing list</a>
        </p>
        <p>
          🗳️ <strong>Propose papers:</strong> <a href="https://github.com/edinburgh-rl/reading-group" className="has-text-link">Vote and suggest on GitHub</a>
        </p>
        <p>
          📺 <strong>Past recordings:</strong> <a href="https://www.youtube.com/@RL_And_Agents_Reading_Group" className="has-text-link" target="_blank" rel="noopener noreferrer">Visit our YouTube channel</a>
        </p>
      </section>

      <section className="section p-5 has-text-justified">
        <h1 className="title">📺 Recorded Presentations</h1>
        <p className="mb-4">Watch recordings of our past presentations and discussions:</p>
        <div>
          <iframe
            width="100%"
            height="315"
            src="https://www.youtube.com/embed/videoseries?list=PLtHBOLEKIlPTp9R6AbfE1vMO-dydApxad"
            title="RL & Agents Reading Group Presentations"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ maxWidth: '560px' }}
          ></iframe>
          <p className="mt-3">
            <a
              href="https://www.youtube.com/playlist?list=PLtHBOLEKIlPTp9R6AbfE1vMO-dydApxad"
              className="button is-danger is-outlined"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>View Full Playlist</span>
            </a>
          </p>
        </div>
      </section>

      <section className="section p-5">
        <h1 className="title">Contacts</h1>
        <p><strong>Organisers:</strong>&nbsp;
          <ObfuscatedEmail
            name="Kale-ab Tessera"
            user="k.tessera"
            domain="ed.ac.uk"
            className="has-text-link"
          /> • {' '}
          <ObfuscatedEmail
            name="Samuel Garcin"
            user="s.garcin"
            domain="ed.ac.uk"
            className="has-text-link"
          /> • {' '}
          <ObfuscatedEmail
            name="Leo Hinckeldey"
            user="l.hinckeldey"
            domain="ed.ac.uk"
            className="has-text-link"
          />
        </p>
      </section>

      <section className="section p-5">
        <h1 className="title">Guest Speakers</h1>
        <p className="mb-4">
          We regularly host guest speakers. Please get in touch if you&apos;re interested in presenting your work.
        </p>
        <details>
          <summary className="button is-light is-small mb-4" style={{ cursor: 'pointer' }}>
            View some Past Speakers:
          </summary>
          <div className="columns is-multiline">
            <div className="column is-half">
              <div className="content is-small">
                <ul>
                  <li>Eduardo Pignatelli, UCL</li>
                  <li>Yifan Zhong, Peking University</li>
                  <li>Joe Marino, Google DeepMind</li>
                  <li>David Abel, Google DeepMind</li>
                  <li>Matthias Gerstgrasser, Stanford & Harvard</li>
                  <li>Geraud Tasse, University of Witwatersrand</li>
                  <li>Emmanuel Bengio, Recursion</li>
                  <li>Sasha Vezhnevets, Google DeepMind</li>
                  <li>Bogdan Mazoure, Mila, Apple MLR</li>
                  <li>Rihab Gorsane, InstaDeep</li>
                  <li>Stephen McAleer, CMU</li>
                  <li>Thomas Burns, Okinawa Institute of Science and Technology</li>
                  <li>Charline Le Lan, Oxford</li>
                  <li>Jason Ma, UPenn</li>
                  <li>Jakob Bauer, Google DeepMind</li>
                  <li>Minqi Jiang, UCL, Meta AI</li>
                  <li>Jack Parker-Holder, Oxford</li>
                  <li>Pablo Samuel Castro, Google Brain</li>
                  <li>Rishabh Agarwal, Google Brain</li>
                  <li>Mahdi Kazemi Moghaddam, University of Adelaide, Australian Institute for Machine Learning</li>
                  <li>Mohamad H. Danesh, National University of Singapore</li>
                  <li>Denis Yarats, NYU, Facebook AI Research</li>
                  <li>Andrei Lupu, McGill University, MILA</li>
                  <li>Alexander Sasha, Google DeepMind</li>
                  <li>Jiahong Li, Beijing Union University</li>
                  <li>Jacopo Castellini, University of Liverpool</li>
                  <li>Robert Loftin, Microsoft Research</li>
                  <li>Vitaly Kurin, Oxford</li>
                  <li>Gregory Palmer, Leibniz University</li>
                  <li>Jiachen Yang, Georgia Tech</li>
                  <li>Ying Wen, UCL, Shanghai Jiao Tong University</li>
                  <li>Greg Farquar, Oxford, Google DeepMind</li>
                  <li>Maximilian Igl, Oxford, Waymo</li>
                </ul>
              </div>
            </div>
          </div>
        </details>
      </section>
    </PageLayout>
  );
}