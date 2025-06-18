import styles from "./page.module.scss";

export default function Home() {
  return (
    <>
      <div className="section pb-1">
        <h1 className="title has-text-centered">🤖 RL & Agents Reading Group</h1>
        <h3 className="subtitle has-text-centered">University of Edinburgh</h3>
        <hr></hr>
      </div>
      <div className="section pt-1 pb-1">
        <div className="columns is-centered">
          <div className="column is-three-quarters">
            <div className="content">
              <h2 className="subtitle">Reinforcement Learning Virtual Reading Group</h2>
              <p>
                We organise regular meetings to discuss recent papers in Reinforcement Learning (RL), Multi-Agent RL and related areas (open-ended learning, LLM agents, robotics, etc ). 
                Meetings take place online and are open to everyone interested in reinforcement learning and participants are expected to read the paper prior to the meeting.
                We were previously known as Autonomous Agents Reading Group. 
              </p>
              <p>
                To join, please sign up <a href="https://forms.gle/DJBe2MAE1t3WeMvr5">here</a>. 
                You can vote for or propose papers for future meetings <a href="https://github.com/edinburgh-rl/reading-group">here</a>. We also have a YouTube channel with recordings of past speakers.
              </p>
              <p>
                <strong>Contact:</strong> 
                  <a href="k.tessera@ed.ac.uk">Kale-ab Tessera</a>, 
                  <a href="s.garcin@ed.ac.uk">Samuel Garcin</a>, 
                  <a href="l.hinckeldey@ed.ac.uk">Leo Hinckeldey</a>
              </p>
              
              <h3 className="subtitle">Presenting your work at the Reading Group</h3>
              <p>
                We regularly host guest speakers, please get in touch using the contact above if you are interested in presenting your work. 
                Below is a non-exhaustive list of past guest speakers.
              </p>
              <ul className={styles.stylefreelist}>
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
      </div>
    </>
  );
}
