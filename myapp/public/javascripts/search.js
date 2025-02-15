document.getElementById('search').addEventListener('input', function () {
    const searchValue = this.value.toLowerCase();
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const name = row.children[0].textContent.toLowerCase();
      const email = row.children[1].textContent.toLowerCase();
      if (name.includes(searchValue) || email.includes(searchValue)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });