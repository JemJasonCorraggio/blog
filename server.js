const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const bodyParser = require('body-parser');

const {PORT, DATABASE_URL} = require('./config');
const {BlogPost} = require('./models');

const app = express();
app.use(bodyParser.json());


// log the http layer
app.use(morgan('common'));


// both runServer and closeServer need to access the same
// server object, so we declare `server` here, and then when
// runServer runs, it assigns a value.
let server;

// this function starts our server and returns a Promise.
// In our test code, we need a way of asynchronously starting
// our server, since we'll be dealing with promises there.
function runServer() {
  const port = process.env.PORT || 8080;
  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      console.log(`Your app is listening on port ${port}`);
      resolve(server);
    }).on('error', err => {
      reject(err);
    });
  });
}

// like `runServer`, this function also needs to return a promise.
// `server.close` does not return a promise on its own, so we manually
// create one.
function closeServer() {
  return new Promise((resolve, reject) => {
    console.log('Closing server');
    server.close(err => {
      if (err) {
        reject(err);
        // so we don't also call `resolve()`
        return;
      }
      resolve();
    });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer().catch(err => console.error(err));
};




// when the root of this router is called with GET, return
// all current BlogPost items
app.get('/posts', (req, res) => {
    BlogPost
        .find()
        .then(BlogPosts => res.json(
            BlogPosts.map(blogPost => blogPost.apiRepr())
        ))
        .catch(err => {
            console.error(err);
            res.status(500).json({message: 'Internal server error'});
        });
});

// can also request by ID
app.get('/posts/:id', (req, res) => {
  BlogPost
    // this is a convenience method Mongoose provides for searching
    // by the object _id property
    .findById(req.params.id)
    .then(blogPost =>res.json(blogPost.apiRepr()))
    .catch(err => {
      console.error(err);
        res.status(500).json({message: 'Internal server error'});
    });
});

app.post('/posts', (req, res) => {

  const requiredFields = ['title', 'author', 'content'];
  for (let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  BlogPost
    .create({
      title: req.body.title,
      author: req.body.author,
      content: req.body.content
    })
    .then(
      blogPost => res.status(201).json(blogPost.apiRepr()))
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

// when PUT request comes in with updated item, ensure has
// required fields. also ensure that item id in url path, and
// item id in updated item object match. if problems with any
// of that, log error and send back status code 400. otherwise
// call `BlogPosts.update` with updated item.
app.put('/posts/:id', (req, res) => {
  // ensure that the id in the request path and the one in request body match
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = (
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`);
    console.error(message);
    return res.status(400).json({message: message});
  }

  // we only support a subset of fields being updateable.
  // if the user sent over any of the updatableFields, we udpate those values
  // in document
  const toUpdate = {};
  const updateableFields = ['title', 'author', 'content'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  BlogPost
    // all key/value pairs in toUpdate will be updated -- that's what `$set` does
    .findByIdAndUpdate(req.params.id, {$set: toUpdate})
    .then(blogPost => res.status(204).end())
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});


// when DELETE request comes in with an id in path,
// try to delete that item from BlogPosts.
app.delete('/restaurants/:id', (req, res) => {
  BlogPost
    .findByIdAndRemove(req.params.id)
    .then(restaurant => res.status(204).end())
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});

app.use('*', function(req, res) {
  res.status(404).json({message: 'Not Found'});
});

module.exports = {app, runServer, closeServer};