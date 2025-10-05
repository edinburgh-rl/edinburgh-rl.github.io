export function Centered({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ overflowX: 'auto' }}>{children}</div>
        </div>
    );

}
