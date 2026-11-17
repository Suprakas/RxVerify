const ApiError = require('../utils/ApiError');

/**
 * validate({ body, query, params }) runs each Zod schema and replaces the raw
 * input with the parsed (coerced, trimmed) value. Errors come back as
 * { field: message } so the form can show them next to the right input.
 */
function validate(schemas) {
  return (req, _res, next) => {
    const errors = {};
    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path.join('.') || part;
          if (!errors[key]) errors[key] = issue.message;
        }
      } else if (part === 'query') {
        // req.query is a getter in Express 5, so keep parsed values separately.
        req.validatedQuery = result.data;
      } else {
        req[part] = result.data;
      }
    }
    if (Object.keys(errors).length) {
      return next(ApiError.badRequest('Please check the highlighted fields', errors));
    }
    return next();
  };
}

module.exports = validate;
