'use client'

interface ObfuscatedEmailProps {
  name: string;
  user: string;
  domain: string;
  className?: string;
}

export default function ObfuscatedEmail ({ name, user, domain, className }: ObfuscatedEmailProps) {
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