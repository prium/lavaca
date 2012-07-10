/*
Lavaca 1.0.0
Copyright (c) 2012 Mutual Mobile

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
(function(ns, EventDispatcher, history) {

var _isAndroid = navigator.userAgent.indexOf('Android') > -1,
    _standardsMode = !_isAndroid && typeof history.pushState == 'function',
    _hasPushed = false,
    _lastHash,
    _hist,
    _pushCount = 0;

function _insertState(hist, position, id, state, title, url) {
  hist.position = position;
  var record = {
        id: id,
        state: state,
        title: title,
        url: url
      };
  hist.sequence[position] = record;
  location.hash = _lastHash = url + '#@' + id;
  return record;
}

/**
 * @class Lavaca.net.History
 * @super Lavaca.events.EventDispatcher
 * HTML5 history abstraction layer
 *
 * @event popstate
 *
 * @constructor
 */
ns.History = EventDispatcher.extend(function() {
  EventDispatcher.call(this);
  /**
   * @field {Array} sequence
   * A list containing history states generated by the app (not used for HTML5 history)
   */
  this.sequence = [];
  /**
   * @field {Number} position
   * The current index in the history sequence (not used for HTML5 history)
   */
  this.position = -1;
  this.replace({}, document.title, location.pathname);
  var self = this;
  if (_standardsMode) {
    /**
     * @field {Function} onPopState
     * Auto-generated callback executed when a history event occurs
     */
    this.onPopState = function(e) {
      if (e.state) {
        _pushCount--;
        self.trigger('popstate', {
          state: e.state.state,
          title: e.state.title,
          url: e.state.url
        });
      }
    };
    window.addEventListener('popstate', this.onPopState, false);
  } else {
    this.onPopState = function() {
      var hash = location.hash,
          code,
          index,
          record,
          item,
          i = -1;
      if (hash) {
        hash = hash.replace(/^#/, '');
      }
      if (hash != _lastHash) {
        _lastHash = hash;
        if (hash) {
          _pushCount--;
          code = hash.split('#@')[1];
          while (item = self.sequence[++i]) {
            if (item.id == code) {
              record = item;
              this.position = i;
              break;
            }
          }
          if (record) {
            location.hash = record.url + '#@' + record.id;
            document.title = record.title;
            self.trigger('popstate', {
              state: record.state,
              title: record.title,
              url: record.url
            });
          }
        }
      }
    };
    if (window.attachEvent) {
      window.attachEvent('onhashchange', this.onPopState);
    } else {
      window.addEventListener('hashchange', this.onPopState, false);
    }
  }
}, {
  /**
   * @method current
   * Retrieve the current history record
   *
   * @return {Object}  The current history record
   */
  current: function() {
    return this.sequence[this.position] || null;
  },
  /**
   * @method hasHistory
   * Determines whether or not there are history states
   *  
   * @returns {Boolean} True when there is a history state
   */
  hasHistory: function() {
    return _pushCount > 0;
  },
  /**
   * @method push
   * Adds a record to the history
   *
   * @param {Object} state  A data object associated with the page state
   * @param {String} title  The title of the page state
   * @param {String} url  The URL of the page state
   */
  push: function(state, title, url) {
    _pushCount++;
    if (_hasPushed) {
      document.title = title;
      if (_standardsMode) {
        history.pushState({state: state, title: title, url: url}, title, url);
      } else {
        _insertState(this, ++this.position, Lavaca.uuid(), state, title, url);
      }
    } else {
      this.replace(state, title, url);
    }
  },
  /**
   * @method replace
   * Replaces the current record in the history
   *
   * @param {Object} state  A data object associated with the page state
   * @param {String} title  The title of the page state
   * @param {String} url  The URL of the page state
   */
  replace: function(state, title, url) {
    _hasPushed = true;
    document.title = title;
    if (_standardsMode) {
      history.replaceState({state: state, title: title, url: url}, title, url);
    } else {
      if (this.position < 0) {
        this.position = 0;
      }
      var currentRecord = this.current() || {id: Lavaca.uuid()};
      _insertState(this, this.position, currentRecord.id, state, title, url);
    }
  },
  /**
   * @method dispose
   * Unbind the history object and ready it for garbage collection
   */
  dispose: function() {
    if (this.onPopState) {
      if (_standardsMode) {
        window.removeEventListener('popstate', this.onPopState, false);
      } else if (window.detachEvent) {
        window.detachEvent('onhashchange', this.onPopState);
      } else {
        window.removeEventListener('hashchange', this.onPopState, false);
      }
    }
    EventDispatcher.prototype.dispose.call(this);
  }
});
/**
 * @method init
 * @static
 * Initialize a singleton history abstraction layer
 *
 * @sig
 * @return {Lavaca.mvc.History}  The history instance
 *
 * @sig
 * @param {Boolean} useHash  When true, use the location hash to manage history state instead of HTML5 history
 * @return {Lavaca.mvc.History}  The history instance
 */
ns.History.init = function(useHash) {
  if (!_hist) {
    if (useHash) {
      ns.History.overrideStandardsMode();
    }
    _hist = new ns.History();
  }
  return _hist;
};
/**
 * @method push
 * @static
 * Adds a record to the history
 *
 * @param {Object} state  A data object associated with the page state
 * @param {String} title  The title of the page state
 * @param {String} url  The URL of the page state
 */
ns.History.push = function() {
  ns.History.init().push.apply(_hist, arguments);
};
/**
 * @method replace
 * @static
 * Replaces the current record in the history
 *
 * @param {Object} state  A data object associated with the page state
 * @param {String} title  The title of the page state
 * @param {String} url  The URL of the page state
 */
ns.History.replace = function() {
  ns.History.init().replace.apply(_hist, arguments);
};
/**
 * @method back
 * @static
 * Goes to the previous history state
 */
ns.History.back = function() {
  history.back();
};
/**
 * @method forward
 * @static
 * Goes to the next history state
 */
ns.History.forward = function() {
  history.forward();
};
/**
 * @method dispose
 * @static
 * Unbind the history object and ready it for garbage collection
 */
ns.History.dispose = function() {
  if (_history) {
    _hist.dispose();
    _hist = null;
  }
};
/**
 * @method on
 * @static
 * Binds an event handler to the singleton history
 *
 * @param {String} type  The type of event
 * @param {Function} callback  The function to execute when the event occurs
 * @return {Lavaca.mvc.History}  The history object (for chaining)
 */
ns.History.on = function() {
  return ns.History.init().on.apply(_hist, arguments);
};
/**
 * @method off
 * @static
 * Unbinds an event handler from the singleton history
 *
 * @param {String} type  The type of event
 * @param {Function} callback  The function to stop executing when the
 *    event occurs
 * @return {Lavaca.mvc.History}  The history object (for chaining)
 */
ns.History.off = function() {
  return ns.History.init().off.apply(_hist, arguments);
};
/**
 * @method overrideStandardsMode
 * @static
 * Sets Histroy to hash mode
 */
ns.History.overrideStandardsMode = function() {
  _standardsMode = false;
};

})(Lavaca.resolve('Lavaca.net', true), Lavaca.events.EventDispatcher, window.history);