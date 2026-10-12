// Общая обёртка секции: заголовок, вступление и содержимое
export default function Section({ id, title, lead, children, className = '' }) {
  return (
    <section id={id} className={`section ${className}`}>
      <div className="wrap">
        <h2 className="section-title">{title}</h2>
        {lead && <p className="section-lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
