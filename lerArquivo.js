var lineReader = require('line-reader');
var fs = require('fs');

module.exports = {
    formatarArquivo: (localArquivo, ano, mes) => async function () {
        console.log(localArquivo)
        console.log(ano)
        console.log(mes)
        var nomeArquivo
        lineReader.eachLine(localArquivo, { encoding: 'latin1' }, function (line, last, cb) {
            console.log(localArquivo)
            var content = line.toString().replace("\t", '');
            if (content[64] === ' ') {
                content = [content.slice(0, 50), ' ', content.slice(50)].join('');
            }
            var inicio = content.slice(133, 143);
            var fim = content.slice(228, 238);
            content = content.replace(inicio, fim);
            nomeArquivo = `RS09519714000185${ano}${mes}Z1001FCN1.txt`;
            console.log(nomeArquivo)
            fs.writeFile(`./arquivoConvertido/${nomeArquivo}`, `${content}\n`, { enconding: 'latin1', flag: 'a' }, function (err) {
                if (err) throw err;
                console.log(err);
            })
        });
        return nomeArquivo;
    },
    data: (nomeArquivo) => {
        var ano, mes;
        mes = nomeArquivo.slice(0, 3);
        mes = mes.toUpperCase();
        ano = nomeArquivo.slice(5, 7);
        switch (mes) {
            case "JAN":
                mes = "01";
                break;
            case "FEV":
                mes = "02";
                break;
            case "MAR":
                mes = "03";
                break;
            case "ABR":
                mes = "04";
                break;
            case "MAI":
                mes = "05";
                break;
            case "JUN":
                mes = "06";
                break;
            case "JUL":
                mes = "07";
                break;
            case "AGO":
                mes = "08";
                break;
            case "SET":
                mes = "09";;
                break;
            case "OUT":
                mes = "10";
                break;
            case "NOV":
                mes = "11";
                break;
            case "DEZ":
                mes = "12";
                break;
            default:
                mes = "ERRO";
        }
        return ([mes, ano]);
    },
    consultaplanos: (codigorecebido) => {
        // Redundância = 2002, 382, 358, 359
        // UP = 373, 349, 374, 348, 350, 1921
        var planos = ["0", "121", "124", "126", "245", "246", "248", "249", "250", "251", "252", "253", "254", "255", "256", "257", "258", "259",
            "260", "261", "262", "263", "264", "265", "266", "267", "268", "269", "270", "271", "272", "273", "274", "275", "276", "277", "278", "279",
            "280", "281", "282", "283", "284", "285", "286", "287", "288", "289", "290", "291", "292", "293", "294", "295", "296", "297", "298", "299",
            "300", "301", "302", "303", "304", "305", "306", "307", "308", "309", "310", "311", "312", "313", "314", "315", "316", "317", "318", "319",
            "320", "321", "322", "323", "324", "325", "326", "327", "328", "329", "330", "331", "332", "333", "334", "335", "339", "340", "341", "342",
            "343", "344", "352", "353", "354", "355", "356", "357", "364", "365", "366", "367", "368", "369", "371",
            "379", "380", "381", "383", "384", "385", "499", "1315", "1326", "1339", "1353", "1354", "1355", "1356", "1367", "1379",
            "1402", "1414", "1426", "1460", "1473", "1684", "1687", "1697", "1709", "1831", "1832", "1833", "1834", "1839", "1840", "1841", "1844",
            "1845", "1846", "1847", "1852", "1892", "1893", "1894", "1896", "1897", "1898", "1899", "1900", "1901", "1902", "1903", "1904", "1907",
            "1908", "1910", "1911", "1912", "1914", "1915", "1916", "1917", "1919", "1920", "1926", "1927", "1929", "1930", "1933", "1936",
            "1937", "1938", "1942", "1943", "1944", "1945", "1946", "1947", "1948", "1949", "1950", "1951", "1952", "1953", "1954", "1955", "1956",
            "1957", "1958", "1959", "1960", "1961", "1965", "1966", "1967", "1968", "1970", "1971", "1972", "1973", "1979", "1981", "1982", "1983",
            "1984", "1985", "1986", "1991", "1992", "1993", "1996", "1997", "1998", "1999", "2003", "2004", "2005", "2006", "2007", "2008",
            "2009", "2010", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2031", "2032", "2034", "2035", "2039",
            "2040", "2041", "2042", "2043", "2044", "2045", "2053", "2054", "2055", "2056", "2057", "2058", "2059", "2060", "2061", "2062", "2063",
            "2064", "2065", "2066", "2067", "2068", "2069", "2070", "2071", "2072", "2073", "2074", "2075", "2082", "2083", "2084", "2085", "2086",
            "2087", "2090", "2091", "2092", "2093", "2094", "2095", "2096", "2097", "2088"];

        var codigo = codigorecebido.slice(3, 7);
        if (planos.indexOf(codigo) !== -1) {
            return (true)
        }
        else {
            return (false)
        }
    },
    tipoliquidacao: (valor) => {
        switch (valor) {
            case 1:
                retorno = "Dinheiro"
                break;
            case 2:
                retorno = "E-Commerce"
                break;
            case 3:
                retorno = "Cartão"
                break;
            case 4:
                retorno = "Depósito"
                break;
            case 5:
                retorno = "Pag-Seguro"
                break;
            case 6:
                retorno = "Profile Bancária (Avulso)"
                break;
            case 7:
                retorno = "Liquidação Por Conciliação"
                break;
            case 8:
                retorno = "Conciliação Manual Pelo Fluxo de Caixa"
                break;
            case 98:
                retorno = "Liquidação A Partir de Remoção de Saldos"
                break;
            case 99:
                retorno = "Outro (Sem Integração)"
                break;
            case 100:
                retorno = "Retorno"
                break;
            default:
                retorno = valor
        }
        return (retorno);
    },
}