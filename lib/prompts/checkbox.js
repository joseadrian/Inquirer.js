/**
 * `list` type prompt
 */

var _ = require("lodash");
var util = require("util");
var clc = require("cli-color");
var Base = require("./base");
var Separator = require("../objects/separator");
var utils = require("../utils/utils");


/**
 * Module exports
 */

module.exports = Prompt;


/**
 * Constructor
 */

function Prompt() {
  Base.apply( this, arguments );

  if (!this.opt.choices) {
    this.throwParamError("choices");
  }

  this.firstRender = true;
  this.pointer = 0;
  this.choices = [].concat(this.opt.choices.choices);

  this.opt.choices.setRender( renderChoices );

  // Make sure no default is set (so it won't be printed)
  this.opt.default = null;

  return this;
}
util.inherits( Prompt, Base );


/**
 * Start the Inquiry session
 * @param  {Function} cb      Callback when prompt is done
 * @return {this}
 */

Prompt.prototype._run = function( cb ) {
  this.done = cb;

  // Move the selected marker on keypress
  this.rl.on( "keypress", this.onKeypress.bind(this) );

  // Once user confirm (enter key)
  this.rl.on( "line", this.onSubmit.bind(this) );

  // Init the prompt
  this.render();
  this.hideCursor();

  return this;
};


/**
 * Render the prompt to screen
 * @return {Prompt} self
 */

Prompt.prototype.render = function() {

  // Render question
  var message    = this.getQuestion();
  var choicesStr = "\n" + this.opt.choices.render( this.pointer );

  if ( this.firstRender ) {
    message += "(Press <space> to select)";
  }

  // Render choices or answer depending on the state
  if ( this.status === "answered" ) {
    message += clc.cyan( this.selection.join(", ") ) + "\n";
  } else {
    message += choicesStr;
    message += "\n  Filter: ";
  }

  this.firstRender = false;

  var msgLines = message.split(/\n/);
  this.height = msgLines.length;

  // Write message to screen and setPrompt to control backspace
  this.rl.setPrompt( _.last(msgLines) );
  this.write( message );

  return this;
};


/**
 * When user press `enter` key
 */

Prompt.prototype.onSubmit = function() {
  var choices = this.opt.choices.where({ checked: true });

  this.selection = _.pluck(choices, "name");
  var answer = _.pluck(choices, "value");

  this.validate( answer, function( isValid ) {
    if ( isValid === true ) {
      this.status = "answered";

      // Rerender prompt (and clean subline error)
      this.down().clean(1).render();

      this.rl.removeAllListeners("keypress");
      this.rl.removeAllListeners("line");
      this.done( answer );
    } else {
      this.down().error( isValid ).clean().render();
      this.hideCursor();
    }
  }.bind(this));
};


/**
 * When user press a key
 */

Prompt.prototype.onKeypress = function( s, key ) {
  if ( key && (key.name === "tab") ) s = undefined;

  var line = this.rl.line.toLowerCase();

  var len = this.opt.choices.search(line).realLength;

  if ( key && key.name === "tab" ) {
    var checked = this.opt.choices.getChoice(this.pointer).checked;
    this.opt.choices.getChoice(this.pointer).checked = !checked;

    line = '';
  } else if ( key && key.name === "up" ) {
    (this.pointer > 0) ? this.pointer-- : (this.pointer = len - 1);
  } else if ( key && key.name === "down" ) {
    (this.pointer < len - 1) ? this.pointer++ : (this.pointer = 0);
  }

  if( key.name === "tab") {
    this.rl.line = '';
    this.opt.choices.restablish();
    this.pointer = 0;
  }

  if(key.name === "tab" || (key.name != "up" && key.name != "down")) {
    this.pointer = 0;
  }

  // Rerender
  this.clean().render().write(line);
};


/**
 * Function for rendering checkbox choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */

function renderChoices( pointer ) {
  var output = "";
  var separatorOffset = 0;

  this.choices.forEach(function( choice, i ) {
    if ( choice instanceof Separator ) {
      separatorOffset++;
      output += " " + choice + "\n";
      return;
    }

    var isSelected = (i - separatorOffset === pointer);
    output += isSelected ? clc.cyan(utils.getPointer()) : " ";
    output += utils.getCheckbox( choice.checked, choice.name );
    output += "\n";
  }.bind(this));

  return output.replace(/\n$/, "");
}
