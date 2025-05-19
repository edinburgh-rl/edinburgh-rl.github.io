import styles from "./page.module.scss";

export default function Home() {
  return (
    <>
      <div className="section pb-1">
        <h1 className="title has-text-centered">Reinforcement Learning Reading Group</h1>
        <h3 className="subtitle has-text-centered">University of Edinburgh</h3>
        <hr></hr>
      </div>
      <div className="section pt-1 pb-1">
        <div className="columns is-centered">
          <div className="column is-three-quarters">
            <div className="content">
              <p>
                We organise meetings to discuss recent papers from the area of reinforcement learning.
                These meetings take place online and are open to everyone interested in reinforcement learning
                and its derivatives. Participants are expected to read the paper prior to the meeting.
              </p>
              <p>
                We regularly host guest speakers, please get in touch if interested in presenting your work.
                Past speakers include:
              </p>
              <ul className={styles.stylefreelist}>
                <li>Eduardo Pignatelli, UCL</li>
                <li>Yifan Zhong, Peking University</li>
                <li>Joe Marino, Google DeepMind</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
