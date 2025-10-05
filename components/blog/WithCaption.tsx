export default function WithCaption({ caption, children }: { caption: string, children: React.ReactNode}) {
  return (
    <figure style={{ textAlign: 'center', margin: '2rem 0' }}>
      <div style={{ display: 'inline-block', overflowX: 'auto' }}>
        {children}
      </div>
      <figcaption>
        {caption}
      </figcaption>
    </figure>
  );
}
