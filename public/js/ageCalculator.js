document.addEventListener("DOMContentLoaded", function () {
    function calculateAge() {
      const birthDate = new Date("2005-02-01");
      const today = new Date();
  
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
  
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }
  
      return age;
    }
  
    function updateAgeDisplay() {
      const ageElement = document.getElementById("age-display");
      if (ageElement) {
        ageElement.textContent = calculateAge() + " years old !";
      }
    }
  
    updateAgeDisplay();
    setInterval(updateAgeDisplay, 3600000); // Update every hour
  });
  