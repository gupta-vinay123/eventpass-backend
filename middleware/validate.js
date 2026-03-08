const { z, ZodError } = require('zod');

const fields = {
    name: z
        .string({ required_error: 'Name is required.' })
        .trim()
        .min(2, 'Name must be at least 2 characters.')
        .max(60, 'Name cannot exceed 60 characters.'),

    email: z
        .string({ required_error: 'Email is required.' })
        .trim()
        .email('Please enter a valid email address.')
        .toLowerCase(),

    password: z
        .string({ required_error: 'Password is required.' })
        .min(6, 'Password must be at least 6 characters.')
        .max(100, 'Password is too long.'),

    mongoId: z
        .string({ required_error: 'ID is required.' })
        .regex(/^[a-f\d]{24}$/i, 'Invalid ID format.'),
};


const schemas = {

    
    register: z.object({
        name:     fields.name,
        email:    fields.email,
        password: fields.password,
        
    }).strict(),   

    
    login: z.object({
        email:    fields.email,
        password: z.string({ required_error: 'Password is required.' }).min(1),
    }).strict(),

   
    
    event: z.object({
        title: z
            .string({ required_error: 'Title is required.' })
            .trim()
            .min(3, 'Title must be at least 3 characters.')
            .max(120, 'Title cannot exceed 120 characters.'),

        description: z
            .string({ required_error: 'Description is required.' })
            .trim()
            .min(10, 'Description must be at least 10 characters.')
            .max(2000, 'Description cannot exceed 2000 characters.'),

        date: z
            .string({ required_error: 'Date is required.' })
            .datetime({ message: 'Date must be a valid ISO date (e.g. 2025-12-31T00:00:00.000Z).' }),

        startTime: z
            .string({ required_error: 'Start time is required.' })
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format (e.g. 19:30).'),

        location: z
            .string({ required_error: 'Location is required.' })
            .trim()
            .min(3, 'Location must be at least 3 characters.')
            .max(200, 'Location cannot exceed 200 characters.'),

       
        price: z.coerce
            .number({ required_error: 'Price is required.' })
            .min(0, 'Price cannot be negative.'),

        totalTickets: z.coerce
            .number({ required_error: 'Total tickets is required.' })
            .int('Total tickets must be a whole number.')
            .min(1, 'There must be at least 1 ticket.')
            .max(100000, 'Total tickets cannot exceed 100,000.'),
    }),
    
    booking: z.object({
        eventId: fields.mongoId,

        numTickets: z.coerce
            .number({ required_error: 'Number of tickets is required.' })
            .int('Tickets must be a whole number.')
            .min(1, 'You must book at least 1 ticket.')
            .max(20, 'You cannot book more than 20 tickets at once.'),
    }).strict(),
};


const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const messages = result.error.errors.map((e) => {
            const field = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
            return `${field}${e.message}`;
        });

        return res.status(400).json({
            message: 'Validation failed.',
            errors: messages,
        });
    }
    req.body = result.data;
    next();
};

module.exports = { validate, schemas };
