module.exports = (fn) => {
    return (req, res, next) => {
        fn(res, res, next).catch(next);
    };
};