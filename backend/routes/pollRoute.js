module.exports = (database, io, voteLimiter) => {
  const express = require('express');
  const router = express.Router();
  const authenticateToken = require('./middleware/authMiddleware')
  router.get('/poll/:id', (req, res) => {
    const pollId = req.params.id;
    console.log()

    const getQuestionQuery = `SELECT * FROM questions WHERE id = ?`;
    const getOptionsQuery = `SELECT id, option_text, votes FROM options WHERE question_id = ?`;

    database.query(getQuestionQuery, [pollId], (err, questionResults) => {
      if (err) {
        console.error('Error fetching poll:', err);
        return res.status(500).json({ error: 'Database error while fetching poll' });
      }

      if (questionResults.length === 0) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      const question = questionResults[0];

      database.query(getOptionsQuery, [pollId], (err, optionResults) => {
        if (err) {
          console.error('Error fetching options:', err);
          return res.status(500).json({ error: 'Database error while fetching options' });
        }

        res.json({
          id: question.id,
          question: question.question,
          expireAt: question.expireAt,
          options: optionResults
        });
      });
    });
  });

  router.get('/poll', (req, res) => {
    const getPollsQuery = `
        SELECT 
            q.id AS pollId,
            q.question,
            q.expireAt,
            o.id AS optionId,
            o.option_text,
            o.votes
        FROM questions q
        LEFT JOIN options o ON q.id = o.question_id
        ORDER BY q.id, o.id
    `;

    database.query(getPollsQuery, (err, results) => {
      if (err) {
        console.error('Error fetching polls:', err);
        return res.status(500).json({ error: 'Database error while fetching polls' });
      }

      const pollsMap = {};

      results.forEach(row => {
        const { pollId, question, expireAt, optionId, option_text, votes } = row;

        if (!pollsMap[pollId]) {
          pollsMap[pollId] = {
            id: pollId,
            question,
            expireAt,
            options: []
          };
        }

        if (optionId) {
          pollsMap[pollId].options.push({
            id: optionId,
            option_text,
            votes
          });
        }
      });

      const polls = Object.values(pollsMap);

      res.json(polls);
    });
  });


  router.post('/poll', (req, res) => {
    const { question, options, expireAt } = req.body;

    if (!question || !Array.isArray(options) || options.length === 0 || !expireAt) {
      return res.status(400).json({ error: 'Missing question, options, or expireAt' });
    }

    const insertQuestionQuery = `
        INSERT INTO questions (question, expireAt) VALUES (?, ?)
    `;

    database.query(insertQuestionQuery, [question, expireAt], (err, result) => {
      if (err) {
        console.error('Error inserting question:', err);
        return res.status(500).json({ error: 'Database error while creating poll' });
      }

      const pollId = result.insertId;

      const insertOptionsQuery = `
          INSERT INTO options (question_id, option_text) VALUES ?
      `;

      const optionValues = options.map(option => [pollId, option]);

      database.query(insertOptionsQuery, [optionValues], (err) => {
        if (err) {
          console.error('Error inserting options:', err);
          return res.status(500).json({ error: 'Database error while adding options' });
        }

        res.status(201).json({ message: 'Poll created!', pollId });
      });
    });
  });

  router.post('/poll/:id/vote', authenticateToken, voteLimiter, (req, res) => {
    const pollId = req.params.id;
    const { optionId } = req.body;
    const userId = req.user;

    if (!optionId) {
      return res.status(400).json({ error: 'optionId is required' });
    }

    const validateOptionQuery = `
    SELECT * FROM options WHERE id = ? AND question_id = ?
  `;

    database.query(validateOptionQuery, [optionId, pollId], (err, result) => {
      if (err) {
        console.error('Error validating option:', err);
        return res.status(500).json({ error: 'Database error during validation' });
      }

      if (result.length === 0) {
        return res.status(400).json({ error: 'Invalid optionId for this poll' });
      }

      // Check if user already voted
      const checkVoteQuery = `
      SELECT * FROM votes WHERE user_id = ? AND poll_id = ?
    `;

      database.query(checkVoteQuery, [userId, pollId], (err, existingVotes) => {
        if (err) {
          console.error('Error checking existing vote:', err);
          return res.status(500).json({ error: 'Database error checking vote' });
        }

        if (existingVotes.length > 0) {
          return res.status(400).json({ error: 'You have already voted on this poll' });
        }

        // Update option's vote count
        const updateVoteQuery = `
        UPDATE options SET votes = votes + 1 WHERE id = ?
      `;

        database.query(updateVoteQuery, [optionId], (err) => {
          if (err) {
            console.error('Error updating vote:', err);
            return res.status(500).json({ error: 'Database error while voting' });
          }

          // Insert vote into votes table
          const insertVoteQuery = `
          INSERT INTO votes (user_id, poll_id, option_id) VALUES (?, ?, ?)
        `;

          database.query(insertVoteQuery, [userId, pollId, optionId], (err) => {
            if (err) {
              console.error('Error inserting vote:', err);
              return res.status(500).json({ error: 'Database error saving vote' });
            }

            // Notify via socket
            const getOptionsQuery = `
            SELECT id, option_text, votes FROM options WHERE question_id = ?
          `;

            database.query(getOptionsQuery, [pollId], (err, updatedOptions) => {
              if (!err) {
                console.log('iiiiiiii')
                io.to(`${pollId}`).emit('poll-update', {
                  pollId,
                  options: updatedOptions
                });
              }
            });

            res.json({ message: 'Vote counted and saved successfully' });
          });
        });
      });
    });
  });


  return router;
}
