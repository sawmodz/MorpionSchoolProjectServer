module.exports = (morpion) => {
  if (checkWin("X", morpion)) {
    return "X";
  } else if (checkWin("O", morpion)) {
    return "O";
  } else {
    if (
      !morpion[0].includes(null) &&
      !morpion[1].includes(null) &&
      !morpion[2].includes(null)
    ) {
      return "J";
    } else {
      return "";
    }
  }
};

const checkWin = (signe, morpion) => {
  if (
    morpion[0][0] === signe &&
    morpion[0][1] === signe &&
    morpion[0][2] === signe
  ) {
    return true;
  } else if (
    morpion[1][0] === signe &&
    morpion[1][1] === signe &&
    morpion[1][2] === signe
  ) {
    return true;
  } else if (
    morpion[2][0] === signe &&
    morpion[2][1] === signe &&
    morpion[2][2] === signe
  ) {
    return true;
  } else if (
    morpion[0][0] === signe &&
    morpion[1][0] === signe &&
    morpion[2][0] === signe
  ) {
    return true;
  } else if (
    morpion[0][1] === signe &&
    morpion[1][1] === signe &&
    morpion[2][1] === signe
  ) {
    return true;
  } else if (
    morpion[0][2] === signe &&
    morpion[1][2] === signe &&
    morpion[2][2] === signe
  ) {
    return true;
  } else if (
    morpion[0][0] === signe &&
    morpion[1][1] === signe &&
    morpion[2][2] === signe
  ) {
    return true;
  } else if (
    morpion[0][2] === signe &&
    morpion[1][1] === signe &&
    morpion[2][0] === signe
  ) {
    return true;
  } else {
    return false;
  }
};
