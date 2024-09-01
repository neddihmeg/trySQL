  let db;
        let fileHandle;

        async function createNewDatabase() {
            const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}` });
            db = new SQL.Database();
            db.run("CREATE TABLE IF NOT EXISTS command_history (id INTEGER PRIMARY KEY AUTOINCREMENT, command TEXT NOT NULL, executed_at DATETIME DEFAULT CURRENT_TIMESTAMP);");
            refreshTableList();
            refreshCommandHistory();
        }

        async function loadDatabase() {
            [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'SQLite Database',
                    accept: { 'application/octet-stream': ['.sqlite'] }
                }]
            });
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();
            const uInt8Array = new Uint8Array(arrayBuffer);
            const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}` });
            db = new SQL.Database(uInt8Array);
 db.run("CREATE TABLE IF NOT EXISTS command_history (id INTEGER PRIMARY KEY AUTOINCREMENT, command TEXT NOT NULL, executed_at DATETIME DEFAULT CURRENT_TIMESTAMP);");

            refreshTableList();
            refreshCommandHistory();
        }

        function executeSQL() {
            const command = document.getElementById('sql-command').value;
            try {
                const results = db.exec(command);
                displayResults(results);
                db.run("INSERT INTO command_history (command) VALUES (?)", [command]);
                refreshTableList();
                refreshCommandHistory();
            } catch (error) {
                document.getElementById('results').innerText = `Error: ${error.message}`;
            }
        }

        function displayResults(results) {
            const resultDiv = document.getElementById('results');
            resultDiv.innerHTML = '';
            if (results.length > 0) {
                const table = document.createElement('table');
                const headerRow = document.createElement('tr');
                results[0].columns.forEach(column => {
                    const th = document.createElement('th');
                    th.innerText = column;
                    headerRow.appendChild(th);
                });
                table.appendChild(headerRow);

                results[0].values.forEach(row => {
                    const tr = document.createElement('tr');
                    row.forEach(value => {
                        const td = document.createElement('td');
                        td.innerText = value;
                        tr.appendChild(td);
                    });
                    table.appendChild(tr);
                });
                resultDiv.appendChild(table);
            } else {
                resultDiv.innerText = 'No results';
            }
        }

   async function loadCSV() {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'CSV Files',
                accept: { 'text/csv': ['.csv'] }
            }]
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const rows = text.split('\n').map(row => row.split(','));
        const tableName = file.name.split('.')[0];
        const columns = rows[0].map(col => `${col} TEXT`).join(', ');

        db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`);
        const insertQuery = `INSERT INTO ${tableName} VALUES (${rows[0].map(() => '?').join(', ')})`;
        rows.slice(1).forEach(row => db.run(insertQuery, row));
        refreshTableList();
    }

 async function saveResultsAsCSV() {
        const command = document.getElementById('sql-command').value;
        try {
            const results = db.exec(command);
            if (results.length > 0) {
                const csvContent = results[0].columns.join(',') + '\n' +
                    results[0].values.map(row => row.join(',')).join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const fileHandle = await window.showSaveFilePicker({
                    types: [{
                        description: 'CSV Files',
                        accept: { 'text/csv': ['.csv'] }
                    }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                alert('No results to save.');
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

        async function saveDatabase() {
            if (!fileHandle) {
                fileHandle = await window.showSaveFilePicker({
                    types: [{
                        description: 'SQLite Database',
                        accept: { 'application/octet-stream': ['.sqlite'] }
                    }]
                });
            }
            const writable = await fileHandle.createWritable();
            const data = db.export();
            await writable.write(data);
            await writable.close();
        }

        function refreshTableList() {
            const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
            const tableList = document.getElementById('tables');
            tableList.innerHTML = '';
            if (tables.length > 0) {
                tables[0].values.forEach(row => {
                    const li = document.createElement('li');
                    li.innerText = row[0];
                    tableList.appendChild(li);
                });
            }
        }

        function refreshCommandHistory() {
            const history = db.exec("SELECT id, command FROM command_history ORDER BY executed_at DESC LIMIT 10");
            const commandList = document.getElementById('recent-commands');
            commandList.innerHTML = '';
            if (history.length > 0) {
                history[0].values.forEach(row => {
                    const li = document.createElement('li');
                    li.innerText = row[1].substring(0, 30) + '...';
                    li.onclick = () => loadCommand(row[0]);
                    commandList.appendChild(li);
                });
            }
        }

        function loadCommand(id) {
            const command = db.exec("SELECT command FROM command_history WHERE id = ?", [id]);
            if (command.length > 0) {
                document.getElementById('sql-command').value = command[0].values[0][0];
            }
        }

        function insertCommand(command) {
            document.getElementById('sql-command').value = command;
        }
 