/*
Copyright (C) 2010, Oleg Efimov <efimovov@gmail.com>

See license text in LICENSE file
*/

// Require modules
var
  sys = require('sys'),
  Mysql = require('../deps/felixge-node-mysql/lib/mysql').Client,
  conn,
  rows;

function selectAsyncBenchmark(callback, cfg) {
  var
    start_time,
    total_time;
  
  start_time = new Date();
  
  conn.query("SELECT * FROM " + cfg.test_table + ";", function (err) {
    if (err) {
      console.log(err);
    }
    
    total_time = ((new Date()) - start_time) / 1000;
    sys.puts("**** " + cfg.insert_rows_count + " rows async selected in " + total_time + "s (" + Math.round(cfg.insert_rows_count / total_time) + "/s)");
    
    // Finish benchmark
    conn.end();
    callback.apply();
  });
}

function insertAsyncBenchmark(callback, cfg) {
  var
    start_time,
    total_time,
    i = 0;
  
  start_time = new Date();
  
  function insertAsync() {
    i += 1;
    if (i <= cfg.insert_rows_count) {
      conn.query(cfg.insert_query, function (err) {
        if (err) {
          console.log(err);
        }
        
        insertAsync();
      });
    } else {
      total_time = ((new Date()) - start_time) / 1000;
      sys.puts("**** " + cfg.insert_rows_count + " async insertions in " + total_time + "s (" + Math.round(cfg.insert_rows_count / total_time) + "/s)");
      
      setTimeout(function () {
        selectAsyncBenchmark(callback, cfg);
      }, cfg.delay_before_select);
    }
  }
  
  insertAsync();
}

function reconnectDestroyAsyncBenchmark(callback, cfg) {
  var
    start_time,
    total_time,
    i = 0;
  
    start_time = new Date();
    
    function reconnectAsync() {
      i += 1;
      if (i <= cfg.reconnect_count) {
        conn.destroy();
        conn.connect(function (err) {
          if (err) {
            console.log(err);
          }
          
          reconnectAsync();
        });
      } else {
        total_time = ((new Date()) - start_time) / 1000;
        sys.puts("**** " + cfg.reconnect_count + " async reconnects with .destroy() in " + total_time + "s (" + Math.round(cfg.reconnect_count / total_time) + "/s)");
        
        insertAsyncBenchmark(callback, cfg);
      }
    }
    
    reconnectAsync();
}

function reconnectEndAsyncBenchmark(callback, cfg) {
  var
    start_time,
    total_time,
    i = 0;
  
    start_time = new Date();
    
    function reconnectAsync() {
      i += 1;
      if (i <= cfg.reconnect_count) {
        conn.end(function () {
          conn.connect(function (err) {
            if (err) {
              console.log(err);
            }
            
            reconnectAsync();
          });
        });
      } else {
        total_time = ((new Date()) - start_time) / 1000;
        sys.puts("**** " + cfg.reconnect_count + " async reconnects with .end() in " + total_time + "s (" + Math.round(cfg.reconnect_count / total_time) + "/s)");
        
        reconnectDestroyAsyncBenchmark(callback, cfg);
      }
    }
    
    reconnectAsync();
}

function escapeBenchmark(callback, cfg) {
  var
    start_time,
    total_time,
    i = 0,
    escaped_string;
  
  start_time = new Date();
  
  for (i = 0; i < cfg.escape_count; i += 1) {
    escaped_string = conn.escape(cfg.string_to_escape);
  }
  
  total_time = ((new Date()) - start_time) / 1000;
  sys.puts("**** " + cfg.escape_count + " escapes in " + total_time + "s (" + Math.round(cfg.escape_count / total_time) + "/s)");
  
  reconnectEndAsyncBenchmark(callback, cfg);
}

function startBenchmark(callback, cfg) {
  var
    start_time,
    total_time;
  
  start_time = new Date();
  
  conn = new Mysql();
  
  conn.host     = cfg.host;
  conn.user     = cfg.user;
  conn.password = cfg.password;
  conn.database = cfg.database;
  
  conn.connect(function (err, result) {
    if (err) {
      console.log(err);
    }
    
    conn.query("DROP TABLE IF EXISTS " + cfg.test_table + ";", function (err) {
      if (err) {
        console.log(err);
      }
      
      conn.query(cfg.create_table_query, function (err) {
        if (err) {
          console.log(err);
        }
        
        total_time = ((new Date()) - start_time) / 1000;
        sys.puts("**** Benchmark initialization time is " + total_time + "s");
        
        escapeBenchmark(callback, cfg);
      });
    });
  });
}

exports.run = function (callback, cfg) {
  startBenchmark(callback, cfg);
};

