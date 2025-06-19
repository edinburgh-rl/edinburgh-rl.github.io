export default function Home() {
  return (
    <>
      <div className="section">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-three-quarters">
              <div className="notification is-info is-light">
                <p className="has-text-weight-bold">
                  📝 This page is currently being updated with new content. If you are interested in the reading group, please visit{' '}
                  <a href="/reading-group" className="has-text-link">our Reading Group page</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}