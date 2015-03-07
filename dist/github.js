var Codecov,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Codecov = (function() {
  Codecov.prototype.slug = null;

  Codecov.prototype.ref = null;

  Codecov.prototype.base = '';

  Codecov.prototype.file = '';

  Codecov.prototype.page = null;

  Codecov.prototype.files = null;

  Codecov.prototype.settings = {
    url: 'https://codecov.io',
    debug: false
  };

  function Codecov(settings) {
    var hotkey, split;
    this.settings = $.extend(null, this.settings, settings);
    if (!($('#codecov-css').length > 0)) {
      $('head').append("<link href=\"" + (chrome.extension.getURL('dist/github.css')) + "\" rel=\"stylesheet\" id=\"codecov-css\">");
    }
    this.slug = (this.settings.debug || document.URL).replace(/.*:\/\/github.com\//, '').match(/^[^\/]+\/[^\/]+/)[0];
    this.page = 'blob';
    hotkey = $('a[data-hotkey=y]');
    if (hotkey.length > 0) {
      split = hotkey.attr('href').split('/');
      if (split[3] === 'blob') {
        this.ref = split[4];
        this.file = "/" + (split.slice(5).join('/'));
      } else if (split[3] === 'commit') {
        this.ref = split[4];
      }
    }
    if (!this.ref) {
      this.base = "&base=" + ($('.commit-id:first').text());
      this.ref = $('.commit-id:last').text();
      this.page = 'compare';
    }
    if (!this.ref) {
      this.base = "&base=" + ($('.current-branch:first').text());
      this.ref = $('.current-branch:last').text();
      this.page = 'pull';
    }
    if (!this.ref) {
      return;
    }
    this.run();
  }

  Codecov.prototype.run = function() {
    var self;
    this.files = $('.repository-content .file');
    if (!this.files) {
      return;
    }
    self = this;
    return $.ajax({
      url: this.settings.url + "/github/" + this.slug + this.file + "?ref=" + this.ref + this.base,
      type: 'get',
      dataType: 'json',
      headers: {
        Accept: 'application/json'
      },
      beforeSend: function() {
        return self.files.each(function() {
          var file;
          file = $(this);
          if (!file.find('.minibutton.codecov')) {
            if (file.find('.file-actions > .button-group').length === 0) {
              file.find('.file-actions a:first').wrap('<div class="button-group"></div>');
            }
            return file.find('.file-actions > .button-group').prepend('<a class="minibutton codecov disabled tooltipped tooltipped-n" aria-label="Requesting coverage from Codecov.io">Coverage loading...</a>');
          }
        });
      },
      success: function(res) {
        var compare, coverage, plus;
        if (self.page !== 'blob') {
          if (res['base']) {
            compare = (res['report']['coverage'] - res['base']).toFixed(0);
            plus = compare > 0 ? '+' : '-';
            $('.toc-diff-stats').append(" Coverage <strong>" + plus + compare + "%</strong>");
            $('#diffstat').append("<span class=\"text-diff-" + (compare > 0 ? 'added' : 'deleted') + " tooltipped tooltipped-s\" aria-label=\"Coverage " + (compare > 0 ? 'increased' : 'decreased') + " " + plus + compare + "%\">" + plus + compare + "%</span>");
          } else {
            coverage = res['report']['coverage'].toFixed(0);
            $('.toc-diff-stats').append(" Coverage <strong>" + coverage + "%</strong>");
            $('#diffstat').append("<span class=\"tooltipped tooltipped-s\" aria-label=\"Coverage " + coverage + "%\">" + coverage + "%</span>");
          }
        }
        $('table-of-contents').find('li').each(function() {
          var file, filename, ref;
          file = $(this);
          filename = file.find('a').text();
          coverage = (ref = res.report.files[filename]) != null ? ref.coverage.toFixed(0) : void 0;
          return file.find('.diffstat.right').prepend(coverage + "%");
        });
        return self.files.each(function() {
          var button, file;
          file = $(this);
          if (self.page === 'compare') {
            coverage = res['report']['files'][file.find('.file-info>span[title]').attr('title')];
          } else if (self.page === 'blob') {
            coverage = res['report'];
          }
          if (file.find('.file-actions > .button-group').length === 0) {
            file.find('.file-actions a:first').wrap('<div class="button-group"></div>');
          }
          if (coverage) {
            button = file.find('.minibutton.codecov').attr('aria-label', 'Toggle Codecov').text('Coverage ' + coverage['coverage'].toFixed(0) + '%').removeClass('disabled').unbind().click(self.page === 'blob' ? self.toggle_coverage : self.toggle_diff);
            file.find('tr').each(function() {
              var cov;
              cov = self.color(coverage['lines'][$(this).find("td:eq(" + (self.page === 'blob' ? 0 : 1) + ")").attr('data-line-number')]);
              return $(this).find('td').addClass("codecov codecov-" + cov);
            });
            if (self.page === 'blob') {
              button.trigger('click');
              return button.trigger('click');
            }
          } else {
            return file.find('.minibutton.codecov').attr('aria-label', 'File not reported to Codecov').text('Not covered');
          }
        });
      },
      statusCode: {
        401: function() {
          return $('.minibutton.codecov').text("Please login at Codecov.io").addClass('danger').attr('aria-label', 'Login to view coverage by Codecov.io');
        },
        404: function() {
          return $('.minibutton.codecov').text("No coverage").attr('aria-label', 'Coverage not found');
        },
        500: function() {
          return $('.minibutton.codecov').text("Coverage error").attr('aria-label', 'There was an error loading coverage. Sorry');
        }
      },
      complete: function() {
        var ref;
        return (ref = self.settings) != null ? typeof ref.callback === "function" ? ref.callback() : void 0 : void 0;
      }
    });
  };

  Codecov.prototype.toggle_coverage = function() {
    if ($('.codecov.codecov-hit.codecov-on').length > 0) {
      return $('.codecov.codecov-hit').removeClass('codecov-on');
    } else if ($('.codecov.codecov-on').length > 0) {
      $('.codecov').removeClass('codecov-on');
      return $(this).removeClass('selected');
    } else {
      $('.codecov').addClass('codecov-on');
      return $(this).addClass('selected');
    }
  };

  Codecov.prototype.toggle_diff = function() {
    var file;
    file = $(this).parents('.file');
    if (file.find('.blob-num-deletion:first').parent().is(':visible')) {
      $(this).addClass('selected');
      file.find('.blob-num-deletion').parent().hide();
      return file.find('.codecov').addClass('codecov-on');
    } else {
      $(this).removeClass('selected');
      file.find('.blob-num-deletion').parent().show();
      return file.find('.codecov').removeClass('codecov-on');
    }
  };

  Codecov.prototype.color = function(ln) {
    var v;
    if (ln === 0) {
      return "missed";
    } else if (!ln) {
      return null;
    } else if (ln === true) {
      return "partial";
    } else if (indexOf.call(ln.toString(), '/') >= 0) {
      v = ln.split('/');
      if (v[0] === '0') {
        return "missed";
      } else if (v[0] === v[1]) {
        return "hit";
      } else {
        return "partial";
      }
    } else {
      return "hit";
    }
  };

  return Codecov;

})();

$(function() {
  return new Codecov;
});
