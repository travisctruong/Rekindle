import './css/statcard.css'

function Statcard({title, value, className}) {
    return (
        <div className={`statcard ${className}`.trim()}>
            <h4 className='statcard__title'>{title}</h4>
            <h1 className='statcard__value'>{value}</h1>
        </div>
    );
}
export default Statcard;