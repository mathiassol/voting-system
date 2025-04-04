let chart;

function viewPool(userId) {
    fetch('/view-pool')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const pool = data.pool;
                console.log('Fetched pool data:', pool);

                const teamSelect = document.getElementById('team-select');
                teamSelect.innerHTML = '';
                pool.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.innerText = option;
                    teamSelect.appendChild(optionElement);
                });



                displayChart(pool);
            }
        })
        .catch(error => {
            console.error('Error fetching pool:', error);
        });
}

function vote() {
    const id = document.getElementById('id').value;
    const poolName = "Team Selection";
    const vote = document.getElementById('team-select').value;

    fetch('/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, poolName, vote })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                viewPool(id);
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function displayChart(pool) {
    console.log('Displaying chart with pool data:', pool);

    const ctx = document.getElementById('vote-chart').getContext('2d');
    const voteCounts = pool.options.map((option, index) => {
        const count = Object.values(pool.votes).filter(vote => vote === (index + 1).toString()).length;
        console.log(`Votes for ${option}: ${count}`);
        return count;
    });

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pool.options,
            datasets: [{
                label: '# of Votes',
                data: voteCounts,
                backgroundColor: ['#ff6384', '#36a2eb'],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function refreshChart() {
    fetch('/view-pool')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayChart(data.pool);
            }
        })
        .catch(error => {
            console.error('Error refreshing chart:', error);
        });
}