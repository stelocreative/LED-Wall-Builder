import CabinetLibrary from './pages/CabinetLibrary';
import Home from './pages/Home';
import ShowDetail from './pages/ShowDetail';
import Shows from './pages/Shows';
import WallDesigner from './pages/WallDesigner';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CabinetLibrary": CabinetLibrary,
    "Home": Home,
    "ShowDetail": ShowDetail,
    "Shows": Shows,
    "WallDesigner": WallDesigner,
}

export const pagesConfig = {
    mainPage: "CabinetLibrary",
    Pages: PAGES,
    Layout: __Layout,
};