import './css/statcard.css'

function Statcard({title, value, detail, className = ''}) {
    return (
        <div className={`statcard ${className}`.trim()}>
            <h4 className='statcard__title'>{title}</h4>
            <div className='statcard__value'>{value}</div>
            {detail && <div className="statcard__detail">{detail}</div>}
        </div>
    );
}
export default Statcard;