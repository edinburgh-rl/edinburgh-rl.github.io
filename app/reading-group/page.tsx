'use client'

interface ObfuscatedEmailProps {
  name: string;
  user: string;
  domain: string;
  className?: string;
}

const ObfuscatedEmail = ({ name, user, domain, className }: ObfuscatedEmailProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.href = `mailto:${user}@${domain}`;
  };

  return (
    <a
      href="#"
      onClick={handleClick}
      className={className}
      style={{ cursor: 'pointer' }}
    >
      {name}
    </a>
  );
};

export default function ReadingGroup() {
  return (
    <>
      <div className="hero is-light is-medium">
        <div className="hero-body">
          <div className="container has-text-centered">
            <h1 className="title is-2">🤖 RL & Agents Reading Group</h1>
            <p className="subtitle is-4">University of Edinburgh</p>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-two-thirds">
              <div className="card mb-6">
                <div className="card-content">
                  <h3 className="title is-5 has-text-primary">📅 Next Reading Group Session</h3>
                  <div className="content">
                    <p className="mb-2">
                      <strong>Date &amp; Time:</strong> <span>Thursday, 24 July 2024, 15:00 BST</span>
                    </p>
                    <p className="mb-2">
                      <strong>Speaker:</strong> Cam Allen
                    </p>
                    <p className="mb-2">
                      <strong>Title:</strong> The Agent Must Choose the Problem Model
                    </p>
                    <p className="mb-2">
                      <strong>Links:</strong><br />
                      <a
                        href="https://camallen.net/files/lambda_discrepancy.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="has-text-link"
                      >
                        Main Paper
                      </a>
                      {' | '}
                      <a
                        href="https://camallen.net/files/markov_state_abstractions.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="has-text-link"
                      >
                        Paper 2
                      </a>
                      {', '}
                      <a
                        href="https://camallen.net/files/traj_abstr_preprint.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="has-text-link"
                      >
                        Paper 3
                      </a>
                    </p>
                    <p className="mb-2">
                      <strong>Bio:</strong><br />
                      Cam Allen is a postdoctoral fellow at the Center for Human-Compatible Artificial Intelligence at the University of California, Berkeley. His research centers on problem formalization: what are the right conceptual models to express the problems we are trying to solve, and how can we build agents that help us model and solve those problems? More generally, Cam is interested in the foundations of intelligence—the computations that enable agency, learning, planning, abstraction, and interaction. He completed his PhD in Computer Science at Brown University in 2023, where he studied structured abstractions for general-purpose decision making, and he co-taught Berkeley&apos;s introductory AI course in spring 2024.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card mb-6">
                <div className="card-content">
                  <h2 className="title is-4 has-text-primary">About Our Reading Group</h2>
                  <p className="mb-4">
                    We organise regular meetings to discuss recent papers in Reinforcement Learning (RL), Multi-Agent RL and related areas (open-ended learning, LLM agents, robotics, etc).
                  </p>
                  <p className="mb-4">
                    Meetings take place online and are open to everyone. Participants are expected to read the paper prior to the meeting.
                  </p>
                  <p className="is-size-7 has-text-grey">
                    <em>We were previously known as the Autonomous Agents Reading Group.</em>
                  </p>
                </div>
              </div>

              <div className="card mb-6">
                <div className="card-content">
                  <h3 className="title is-5 has-text-primary">How to Join</h3>
                  <div className="content">
                    <p className="mb-3">
                      📝 <strong>Sign up:</strong> <a href="https://forms.gle/anHVSi97d6F6M37R6" className="has-text-link">Join our mailing list</a>
                    </p>
                    <p className="mb-3">
                      🗳️ <strong>Propose papers:</strong> <a href="https://github.com/edinburgh-rl/reading-group" className="has-text-link">Vote and suggest on GitHub</a>
                    </p>
                    <p>
                      📺 <strong>Past recordings:</strong> <a href="https://www.youtube.com/@RL_And_Agents_Reading_Group" className="has-text-link" target="_blank" rel="noopener noreferrer">Visit our YouTube channel</a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="card mb-6">
                <div className="card-content">
                  <h3 className="title is-5 has-text-primary">📺 Recorded Presentations</h3>
                  <div className="content">
                    <p className="mb-4">Watch recordings of our past presentations and discussions:</p>
                    <div className="box has-background-light">
                      <div className="has-text-centered">
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
                    </div>
                  </div>
                </div>
              </div>

              <div className="card mb-6">
                <div className="card-content">
                  <h3 className="title is-5 has-text-primary">Contact</h3>
                  <div className="content">
                    <p><strong>Organisers:</strong></p>
                    <p>
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
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <h3 className="title is-5 has-text-primary">Guest Speakers</h3>
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
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}