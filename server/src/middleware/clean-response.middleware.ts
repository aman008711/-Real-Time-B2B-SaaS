import { Request, Response, NextFunction } from 'express';

function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // If it's a Mongoose document, convert it to a plain JSON object first
  if (obj.toJSON && typeof obj.toJSON === 'function') {
    obj = obj.toJSON();
  } else if (obj.toObject && typeof obj.toObject === 'function') {
    obj = obj.toObject();
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  if (typeof obj === 'object') {
    // Convert Mongo ObjectId to simple string
    if (obj.constructor && obj.constructor.name === 'ObjectId') {
      return obj.toString();
    }

    const clean: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'password' || key === 'passwordHash' || key === '__v') {
        continue;
      }

      const cleanKey = key === '_id' ? 'id' : key;
      clean[cleanKey] = cleanObject(value);
    }

    if (obj._id && !clean.id) {
      clean.id = obj._id.toString();
    }

    return clean;
  }

  return obj;
}

export function cleanApiResponse(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json;

  res.json = function (body: any) {
    const cleanedBody = cleanObject(body);
    return originalJson.call(this, cleanedBody);
  };

  next();
}
