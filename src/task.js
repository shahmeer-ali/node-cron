'use strict';

var convertExpression = require('./convert-expression');
var validatePattern = require('./pattern-validation');

var events = require('events');

module.exports = (function(){
  function matchPattern(pattern, value){
    if( pattern.indexOf(',') !== -1 ){
      var patterns = pattern.split(',');
      return patterns.indexOf(value.toString()) !== -1;
    }
    return pattern === value.toString();
  }
  
  function mustRun(task, date){
    var runInSecond = matchPattern(task.expressions[0], date.getSeconds());
    var runOnMinute = matchPattern(task.expressions[1], date.getMinutes());
    var runOnHour = matchPattern(task.expressions[2], date.getHours());
    var runOnDayOfMonth = matchPattern(task.expressions[3], date.getDate());
    var runOnMonth = matchPattern(task.expressions[4], date.getMonth() + 1);
    var runOnDayOfWeek = matchPattern(task.expressions[5], date.getDay());
    
    var runOnDay = false;
    var delta = task.initialPattern.length === 6 ? 0 : -1;
    
    if (task.initialPattern[3 + delta] === '*') {
      runOnDay = runOnDayOfWeek;
    } else if (task.initialPattern[5 + delta] === '*') {
      runOnDay = runOnDayOfMonth;
    } else {
      runOnDay = runOnDayOfMonth || runOnDayOfWeek;
    }
    
    return runInSecond && runOnMinute && runOnHour && runOnDay && runOnMonth;
  }
  
  function Task(pattern, execution){
    validatePattern(pattern);
    this.initialPattern = pattern.split(' ');
    this.pattern = convertExpression(pattern);
    this.execution = execution;
    this.expressions = this.pattern.split(' ');

    events.EventEmitter.call(this);
  }
  
  Task.prototype = events.EventEmitter.prototype;
  
  Task.prototype.update = function(date){
    if(mustRun(this, date)){
      try {
        var self = this;
        var execution = new Promise(function(resolve, reject){
          self.emit('started', self);
          var ex = self.execution();
          if( execution instanceof Promise){
            ex.then(resolve).catch(reject);
          }
        }).then(function(){
          self.emit('done', self);
        }).catch(function(error){
          console.error(error);
          self.emit('failed', error);
        });
      } catch (error) {
        console.error(error);
        self.emit('failed', error);
      }  
    }
  };
  
  return Task;
}());
