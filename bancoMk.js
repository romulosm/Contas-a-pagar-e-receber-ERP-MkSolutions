var lineReader = require('line-reader');
var fs = require('fs');

module.exports = {
    procurarDado: (dataInicio, dataFim) => async function () {
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
    }
}