var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var AuthorSchema = new Schema (
	{
		first_name: {type: String, required: true, max: 100},
		family_name: {type: String, required: true, max: 100},
		date_of_birth: {type: Date},
		date_of_death: {type: Date},
	}
);

// virtual for author's full name
AuthorSchema
.virtual('name')
.get(function () {
	var fullname = '';
	if (this.first_name && this.family_name) {
		fullname = this.family_name + ', ' + this.first_name
	}
	if (!this.first_name || !this.family_name) {
		fullname = '';
	}

	return fullname
});

// virtual for author's lifespan
AuthorSchema.virtual('lifespan').get(function() {
  var lifetime_string = '';
  if (this.date_of_birth) {
    lifetime_string = moment(this.date_of_birth).format('MMMM Do, YYYY');
  }
  lifetime_string += ' - ';
  if (this.date_of_death) {
    lifetime_string += moment(this.date_of_death).format('MMMM Do, YYYY');
  }
  return lifetime_string;
});

AuthorSchema.virtual('date_of_birth_yyyy_mm_dd').get(function() {
  return moment(this.date_of_birth).format('YYYY-MM-DD');
});

AuthorSchema.virtual('date_of_death_yyyy_mm_dd').get(function() {
  return moment(this.date_of_death).format('YYYY-MM-DD');
});


// virtual for author's URL
AuthorSchema
.virtual('url')
.get(function () {
	return '/catalogue/author/' + this._id;
});

// virtual for author's birth date
AuthorSchema
.virtual('date_of_birth_formatted')
.get(function () {
	return this.date_of_birth ?
	moment(this.date_of_birth).format('MMMM Do, YYYY') : '';
});

// virtual for author's death date
AuthorSchema
.virtual('date_of_death_formatted')
.get(function () {
	return this.date_of_death ?
	moment(this.date_of_death).format('MMMM Do, YYYY') : '';;
});

// export model
module.exports = mongoose.model('Author', AuthorSchema);