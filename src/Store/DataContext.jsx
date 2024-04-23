import React from "react";
const dataContext = React.createContext({
  csvHeader: [],
  isLogin: false,
  primaryKey: "",
  imageColName: "",
  skippingKey: [],
  firstInputFileName: "",
  secondInputFileName: "",
  firstInputCsvFiles: [],
  secondInputCsvFiles: [],
  correctedCsv: {},
  zipImageFile: [],
  imageMappedData: [],
  csvFile: [],
  csvDataWithImage: [],
  modifyIslogin: () => {},
  addToCsvHeader: () => {},
  addToPrimaryKey: () => {},
  addToSkippingKey: () => {},
  addFirstInputFileName: () => {},
  addSecondInputFileName: () => {},
  addFirstInputCsvFile: () => {},
  addSecondInputCsvFile: () => {},
  addToCorrectedCsv: () => {},
  addZipImageFile: () => {},
  setImageColName: () => {},
  setImageMappedData: () => {},
  setCsvFile: () => {},
  setCsvDataWithImage: () => {},
});

export default dataContext;
