// ==========================================
// LIVE SUPABASE DIRECT RE-ROUTING ENGINE
// ==========================================
(function(global) {
  const customSupabaseBridge = {
    createClient: function(url, key) {
      console.log("🚀 Direct Cloud Web Routing Layer Engaged Successfully.");
      
      return {
        from: function(tableName) {
          return {
            // 📡 LIVE FETCH OPERATIONS
            select: function(columns = '*') {
              return {
                eq: function(columnName, matchValue) {
                  return {
                    maybeSingle: async function() {
                      try {
                        const res = await fetch(`${url}/rest/v1/${tableName}?${columnName}=eq.${encodeURIComponent(matchValue)}&select=${columns}`, {
                          method: "GET",
                          headers: {
                            "apikey": key,
                            "Authorization": `Bearer ${key}`,
                            "Content-Type": "application/json"
                          }
                        });
                        if (res.ok) {
                          const data = await res.json();
                          return { data: data.length > 0 ? data[0] : null, error: null };
                        }
                        const errData = await res.json();
                        return { data: null, error: errData };
                      } catch (err) {
                        return { data: null, error: err };
                      }
                    }
                  };
                },
                order: function(column, options = {}) {
                  return {
                    then: async function(callback) {
                      try {
                        const direction = options.ascending ? 'asc' : 'desc';
                        const res = await fetch(`${url}/rest/v1/${tableName}?order=${column}.${direction}`, {
                          method: "GET",
                          headers: {
                            "apikey": key,
                            "Authorization": `Bearer ${key}`,
                            "Content-Type": "application/json"
                          }
                        });
                        if (res.ok) {
                          const data = await res.json();
                          return callback({ data: data, error: null });
                        }
                        return callback({ data: [], error: true });
                      } catch (err) {
                        return callback({ data: [], error: err });
                      }
                    }
                  };
                }
              };
            },

            // 📡 LIVE DATA SIGNUP ROW INSERTIONS
            insert: async function(payloadArray) {
              try {
                // Standardize column parameters to map flawlessly to postgresql
                const item = payloadArray[0];
                const cleanPayload = {
                  email: item.email,
                  first_name: item.first_name || item.firstName,
                  password: item.password,
                  avatar_data_url: item.avatar_data_url || item.avatar || ""
                };

                const res = await fetch(`${url}/rest/v1/${tableName}`, {
                  method: "POST",
                  headers: {
                    "apikey": key,
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                  },
                  body: JSON.stringify(cleanPayload)
                });

                if (res.ok) {
                  console.log(`📥 Cloud Sync: Row successfully saved to table [${tableName}]`);
                  return { data: payloadArray, error: null };
                }
                const errText = await res.text();
                console.error("Supabase insert rejected payload:", errText);
                return { data: null, error: errText };
              } catch (err) {
                console.error("Network insertion execution crashed:", err);
                return { data: null, error: err };
              }
            }
          };
        }
      };
    }
  };

  // Expose variable names globally to window scopes
  global.supabase = customSupabaseBridge;
  global.Supabase = customSupabaseBridge;
  console.log("📦 Standalone Cloud Connection Proxy Attached Cleanly.");
})(window);
