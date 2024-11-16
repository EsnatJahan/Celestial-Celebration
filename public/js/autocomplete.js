let availablekeys = ["Choco", "Vanila"];

const resultBox = document.querySelector(".result-box");
const inputBox = document.getElementById("input-box");

inputBox.onkeyup = function () {
  let result = [];
  let input = inputBox.value;
  if (input.length) {
    result = availablekeys.filter((keyword) => {
      return keyword.toLowerCase().includes(input.toLocaleLowerCase());
    });
  }
  display(result);
};

function display(result) {
  const content = result.map((list) => {
    return `<li onclick=selectInput(this) > ${list} </li>`;
  });
  resultBox.innerHTML = `<ul> ${content} </ul>`;
}

function selectInput(list) {
  inputBox.value = list.innerHTML;
  resultBox.innerHTML = "";
}
