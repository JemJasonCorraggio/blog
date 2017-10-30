const mongoose = require('mongoose');

const BlogSchema = mongoose.Schema( {
      title: {type: String, required: true},
      content: {type: String, required: true},
      author: {firstName: {type: String, required: true}, lastName: {type: String, required: true}},
      created: {type: Number}
    });

BlogSchema.virtual('authorString').get(function() {
  return `${this.author.firstName} ${this.author.lastName}`.trim()});
  
BlogSchema.methods.apiRepr = function() {

  return {
    id: this._id,
    title: this.title,
    author: this.authorString,
    content: this.content,
    created: Date.now(),
  };
};
const BlogPost = mongoose.model('BlogPost',BlogSchema);
module.exports = {BlogPost};