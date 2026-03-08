const { Queue } = require('bullmq');
const { queueClient } = require('../config/redis');

const emailQueue = new Queue('email-queue', {
    connection: queueClient,
    defaultJobOptions: {
        attempts:  3,           
        backoff: {
            type:  'exponential',
            delay: 2000,        
        },
        removeOnComplete: 100,  
        removeOnFail:     50,   
    },
});

module.exports = emailQueue;
