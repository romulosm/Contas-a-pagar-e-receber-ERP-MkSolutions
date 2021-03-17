const express = require('express');
const app = express();
var bodyParser = require('body-parser')
var fs = require('fs');
var stringify = require('csv-stringify');
const { Client } = require('pg');
var lineReader = require('line-reader');

const bancoMk = require('./bancoMk.js');
var arquivo = require('./lerArquivo.js');
let enviarEmail = require('./enviarEmail.js');

const port = 3000

multer = require('multer');

var path = require('path')
var upload = multer({ storage: storage })

app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    next();
});

const client = new Client({
    user: '',
    host: '',
    database: '',
    password: '',
    port: 5432,
})

client.connect();

var buffer = [];

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './arquivoRecebido')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

app.post('/financeiro', upload.single('file'), (req, res) => {
    var nomeArquivo = req.file.filename;
    var pasta = req.file.filename;
    var nomeOriginal = req.file.originalname;
    var data = arquivo.data(nomeOriginal);
    var mes = data[0];
    var ano = data[1];

    lineReader.eachLine(`./arquivoRecebido/${nomeArquivo}`, { encoding: 'latin1' }, function (line, last) {
        var content = line.toString().replace("\t", '');
        if (content[64] === ' ') {
            content = [content.slice(0, 50), ' ', content.slice(50)].join('');
        }
        if (content[51] === ' ') {
            content = content.slice(0, 51) + content.slice(52)
        }
        var primeiracoluna = content.slice(132, 143);
        var terceiracoluna = content.slice(227, 238);
        content = content.replace(primeiracoluna, terceiracoluna);
        var segundacoluna = content.slice(193, 204);
        var PLN = content.slice(82, 85);
        var plano = content.slice(82, 90);
        var alterareferencia = content.slice(92, 132)
        var servico = "SERVICO DE COMUNICACAO MULTIMIDIA       "
        content = content.replace(alterareferencia, servico);
        content = content.replace(segundacoluna, terceiracoluna);
        if (PLN === "PLN") {
            if (arquivo.consultaplanos(plano)) {
                var fatura = content.slice(51, 66);
                if (buffer.indexOf(fatura) == -1) {
                    buffer.push(fatura);
                    nomeArquivo = `RS09519714000185${ano}${mes}21001FCN1.txt`;
                    fs.writeFileSync(`./arquivoConvertido/${nomeArquivo}`, `${content}\n`, { enconding: 'latin1', flag: 'a' }, function (err) {
                        if (err) throw err;
                    })
                }
            }
        }
        if (last == true) {
            buffer = [];
            fs.readFile(`./arquivoConvertido/${nomeArquivo}`, 'utf-8', function (err, data) {
                if (err) throw err;
                res.json({ nome: `${nomeArquivo}`, arquivo: data });
                fs.unlinkSync(`./arquivoConvertido/${nomeArquivo}`);
                fs.unlinkSync(`./arquivoRecebido/${pasta}`);
            });
        }
    });
});

app.post('/contas_pagar', (req, res) => {
    const wordInString = (s, word) => new RegExp('\\b' + word + '\\b', 'i').test(s);
    let dataInicio = req.body.data_inicial;
    let dataFim = req.body.data_final;
    let query = "select cs.codconciliacaosaldo as codprofile, pp.nome_profile from mk_conciliacao_saldo cs left join mk_profile_pgto pp on pp.codprofile=cs.cd_profile";

    client.query(query, (err, respo) => {
        profiles = respo.rows;
    });

    let query_cofres = "select codcontacofre, descricao from mk_conta_cofre";

    client.query(query_cofres, (err, res_cofres) => {
        cofres = res_cofres.rows;
    });

    let query_faturas = "select pc.codconta as conta, f.descricao as descricao_fatura, p.nome_razaosocial as credor, f.valor_total_original as valor, to_char(f.data_vencimento, 'DD/MM/YYYY') as vencimento,"+
                        "to_char(f.data_liquidacao, 'DD/MM/YYYY') as pago_em, pc.unidade_financeira as plano_de_contas, uf.descricao as descricao_plano_de_contas, '' as profile, f.obs_liquidacao from mk_faturas f "+
                        "left join mk_contas_faturadas cf on cf.cd_fatura = f.codfatura "+
                        "left join mk_plano_contas pc on pc.codconta = cf.cd_conta "+
                        "left join mk_pessoas p on p.codpessoa=f.cd_pessoa "+
                        "left join mk_unidade_financeia uf on uf.nomenclatura=pc.unidade_financeira "+
                        "where f.data_liquidacao >= '"+dataInicio+"' and f.data_liquidacao <='"+dataFim+"' and f.tipo='P'";
    client.query(query_faturas, (err, res_faturas) => {
        faturas = res_faturas.rows;
        faturas.forEach(function (fatura,fatura_key){
            profiles.forEach(function (profile, profile_key) {
                if(wordInString(fatura.obs_liquidacao, 'banco')){
                    var banco_id = fatura.obs_liquidacao.split('num. ');
                    if(banco_id[1]){
                        banco_id = banco_id[1].split('Valor');
                        banco_id = banco_id[0];
                        if(banco_id == profile.codprofile){
                            faturas[fatura_key].profile = profile.nome_profile;
                        }
                    }else{
                        console.log("Erro");
                        console.log(banco_id);
                    }
                }
            });
            cofres.forEach(function (cofre, cofre_key) {
                if(wordInString(fatura.obs_liquidacao, 'cofre')){
                    var cofre_id = fatura.obs_liquidacao.split('num. ');
                    if(cofre_id[1]){
                        cofre_id = cofre_id[1].split('Valor');
                        cofre_id = cofre_id[0];
                        if(cofre_id == cofre.codcontacofre){
                            faturas[fatura_key].profile = cofre.descricao;
                        }
                    }else{
                        console.log("Erro");
                        console.log(banco_id);
                    }
                }
            });
            faturas[fatura_key].plano_de_contas=faturas[fatura_key].plano_de_contas+" "+faturas[fatura_key].descricao_plano_de_contas;
            delete faturas[fatura_key].descricao_plano_de_contas;
            delete faturas[fatura_key].obs_liquidacao;
        });
        stringify(faturas, {
            header: true,
            delimiter: ";"
        }, function (err, output) {
            fs.writeFileSync('./csv' + '/contas_pagar.csv', output);
            console.log("FIM");
            enviarEmail.enviarEmailRelatorioContasPagar();
        })
    });
});


app.post('/contas', (req, res) => {
    let dataInicio = req.body.data_inicial;
    let dataFim = req.body.data_final;
    let response = [];
    let result = [];
    let contador1 = 0;
    let contador2 = 0;
    let contador3 = 0;
    function converterParaReal(numero) {
        if(typeof numero != "undefined"){
            if(numero != null){
                var numero_string = numero.toString();
                var resultado = numero_string.replace('.',',');
                return resultado;
            }else{
                return numero;
            }
        }
    }

    let query0 = `select codfatura, descricao as descricao_fatura, vlr_liquidacao, usuario_lancamento, valor_total_original, valor_liquidado, num_arq_retorno, forma_pgto_liquidacao, obs_liquidacao, to_char(data_vencimento, 'DD/MM/YYYY') as data_de_vencimento, to_char(data_liquidacao, 'DD/MM/YYYY') as Data_de_Liquidação from mk_faturas WHERE data_liquidacao >= '${dataInicio}' and data_liquidacao <='${dataFim}' and tipo='R'`;
    //console.log(query0);
    client.query(query0, (err, resPrimeiro) => {
        let resprim = resPrimeiro.rows;
        let temMov = false;
        let mov = [];
        let man = [];
        resprim.forEach(function (itm, ind) {
            
            contador1 = resprim.length;

            let query = `select f.codfatura as fatura, f.descricao as descricao_fatura, f.usuario_lancamento, p.nome_razaosocial as cliente, c.cidade, us.usr_nome as usuario_lancamento, pcd.cd_emitente,f.num_arq_retorno, f.forma_pgto_liquidacao,f.obs_liquidacao, to_char(f.data_vencimento, 'DD/MM/YYYY') as data_de_vencimento,pc.valor_lancamento, f.data_vencimento as data_original, to_char(f.data_liquidacao, 'DD/MM/YYYY') as Data_de_Liquidação ,pcd.descricao as Serviço, f.descricao as Plano, f.valor_total_original as valor_Total,f.valor_liquidado as Valor_Liquidado, pcd.vlr as Valor_Derivação, '0' as acrescimo, '0' as desconto, '0' as movimento, '0' as manual, pp.nome_profile as Profile,e.razao_social as Emitente, '0' as total_a_receber from mk_plano_contas_derivacoes pcd left join mk_plano_contas pc on pc.codconta=pcd.cd_conta left join mk_contas_faturadas cf on cf.cd_conta = pc.codconta left join mk_faturas f on cf.cd_fatura = f.codfatura left join mk_emitente e on e.codemitente=pcd.cd_emitente left join mk_profile_pgto pp on pp.codprofile = f.cd_profile_cobranca left join mk_pessoas p on p.codpessoa=f.cd_pessoa left join mk_cidades c on p.codcidade=c.codcidade left join fr_usuario us on us.usr_login=f.usuario_liquidacao where pc.nomenclatura_integracao = 'CNT' and f.codfatura = '${itm.codfatura}' and f.data_vencimento = pc.data_vencimento`
            //console.log(query);
            client.query(query, (err, respo) => {
                response = respo.rows;
            })

            let query2 = `select pc.valor_lancamento as Valor_Lancamento, uf.descricao as unidade_financeira_descricao, c.cidade, pc.descricao_conta, us.usr_nome as usuario_lancamento, p.nome_razaosocial as cliente, pc.nomenclatura_integracao, pc.unidade_financeira, pc.data_vencimento from mk_plano_contas pc left join mk_contas_faturadas cf on cf.cd_conta = pc.codconta left join mk_faturas f on cf.cd_fatura = f.codfatura left join mk_pessoas p on p.codpessoa=f.cd_pessoa left join mk_cidades c on p.codcidade=c.codcidade left join mk_unidade_financeia uf on uf.nomenclatura=pc.unidade_financeira left join fr_usuario us on us.usr_login=f.usuario_liquidacao where pc.nomenclatura_integracao != 'CNT' and f.codfatura = '${itm.codfatura}'`;
            client.query(query2, (err, resp) => {
                let valor = resp.rows;
                if(response.length>0){
                    contador2 = 0;
                    var valor_total_contrato = 0;
                    //Calcula o valor total dos contratos
                    response.forEach(function(plano, j){
                        valor_total_contrato += parseFloat(plano.valor_derivação);
                    });
                    response.forEach(function (inicio, chave) {
                        if(response[chave].valor_liquidado==0){
                            response[chave].valor_liquidado = itm.vlr_liquidacao;
                        }
                        contador3++;
                        console.log("Fatura: "+ind+" de "+resprim.length+" Fatura Número: "+itm.codfatura);
                        if(response[chave].forma_pgto_liquidacao > 0){
                            response[chave].forma_pgto_liquidacao = arquivo.tipoliquidacao(response[chave].forma_pgto_liquidacao )
                        }else{
                            response[chave].forma_pgto_liquidacao = "Manual";
                        }

                        if(response[chave].num_arq_retorno>0){
                            response[chave].num_arq_retorno = "Retorno";
                        }else{
                            response[chave].num_arq_retorno = "Manual";
                        }

                        response[chave].forma_pgto_liquidacao = tipoliquidacao = response[chave].forma_pgto_liquidacao;

                        let data_vencimento_original = response[chave].data_original
                        let mes = data_vencimento_original.getMonth() + 1;
                        let dia = data_vencimento_original.getDate();
                        let ano = data_vencimento_original.getFullYear();
                        let dataAjustada = `${ano}-${mes}-${dia}`;
                        delete response[chave].data_original;

                        if (valor.length > 0) {
                            //console.log(valor_total_contrato);
                            //Calcula o lançamento manual dos contratos
                            valor.forEach(function (first, key) {
                                if(first.nomenclatura_integracao == 'MAN'){
                                    delete response[chave].cd_emitente;
                                    let mes2 = (first.data_vencimento.getMonth() + 1);
                                    let dia2 = first.data_vencimento.getDate();
                                    let ano2 = first.data_vencimento.getFullYear();
                                    let dataAjustada2 = `${ano2}-${mes2}-${dia2}`;
                                    if (dataAjustada == dataAjustada2) {
                                        let valorDerivacao = parseFloat(response[chave].valor_derivação);
                                        let valorTotal = valor_total_contrato;
                                        let proporcao = valorDerivacao / valorTotal;
                                        let valor1 = first.valor_lancamento;
                                        let manual = valor1 * proporcao;
                                        if(response[chave].manual=="0"){
                                            response[chave].manual = 0;
                                        }
                                        response[chave].manual += manual;
                                        //console.log("MAN "+response[chave].manual);
                                    }
                                    /*if(man.indexOf(first) == -1){
                                        let arr = {
                                            "fatura": response[chave].fatura,
                                            "descricao_fatura":response[chave].descricao_fatura,
                                            "cliente": response[chave].cliente,
                                            "num_arq_retorno": response[chave].num_arq_retorno,
                                            "forma_pgto_liquidacao": response[chave].forma_pgto_liquidacao,
                                            "obs_liquidacao": response[chave].obs_liquidacao,
                                            "data_de_vencimento": response[chave].data_de_vencimento,
                                            "valor_lancamento": converterParaReal(first.valor_lancamento),
                                            "data_de_liquidação": response[chave].data_de_liquidação,
                                            "serviço": first.descricao_conta,
                                            "plano": response[chave].plano,
                                            "valor_total": converterParaReal(response[chave].valor_total),
                                            "valor_liquidado": converterParaReal(response[chave].valor_liquidado),
                                            "valor_derivação": 0,
                                            "acrescimo": 0,
                                            "profile": response[chave].profile,
                                            "emitente":'',
                                            "desconto": 0,
                                            "movimento": 0
                                        }; 
                                        response.push(arr);
                                        contador2++;
                                        man.push(first);
                                    }*/
                                }

                                if(first.nomenclatura_integracao == 'MOV'){
                                    //console.log("entrou no MOV")
                                        temMov = false;
                                        let servico= "";
                                        let emitente= "";
                                        response.forEach(function(plano, j){
                                            if(mov.indexOf(first) == -1)
                                            {
                                                //console.log(first.codconta)
                                                //console.log("não existe no mov")
                                                //console.log(first.codconta);
                                                if(first.unidade_financeira == "01.00.01.03")
                                                {
                                                    if(plano.cd_emitente == 4)
                                                    {
                                                        servico = "Receita Visita Técnica";
                                                        emitente = "FLYSERVICE SERVICO DE TECNOLOGIA LTDA";
                                                        temMov = true;
                                                        if(response[j].movimento=="0"){
                                                            response[j].movimento = 0;
                                                        }
                                                        response[j].movimento += first.valor_lancamento;
                                                        mov.push(first);
                                                    }
                                                }
                                                if(first.unidade_financeira == "01.01.00")
                                                {
                                                    if(plano.cd_emitente == 2)
                                                    {
                                                        servico = "Receita Venda Produto";
                                                        emitente = "FLYBYTE COMUNICACAO MULTIMIDIA LTDA";
                                                        temMov = true;
                                                       if(response[j].movimento=="0"){
                                                            response[j].movimento = 0;
                                                        }
                                                        response[j].movimento += first.valor_lancamento;
                                                        mov.push(first);
                                                    } 
                                                }
                                            }
                                        })

                                        if(temMov==false){
                                            if(mov.indexOf(first) == -1)
                                            {
                                                var acrescimo_mov = 0;
                                                var desconto_mov = 0
                                                response.forEach(function(plano, j){
                                                    if (plano.nomenclatura_integracao == 'ACR') {
                                                        //console.log("entrou no ACR")
                                                        let mes2 = (plano.data_vencimento.getMonth() + 1);
                                                        let dia2 = plano.data_vencimento.getDate();
                                                        let ano2 = plano.data_vencimento.getFullYear();
                                                        let dataAjustada2 = `${ano2}-${mes2}-${dia2}`;
                                                        if (dataAjustada == dataAjustada2) {
                                                            let valorDerivacao = first.valor_lancamento;
                                                            let valorTotal = response[chave].valor_total;
                                                            let proporcao = valorDerivacao / valorTotal;
                                                            let valor1 = plano.valor_lancamento;
                                                            let acrescimo = valor1 * proporcao;
                                                            acrescimo_mov += acrescimo;
                                                        }
                                                    }
                                                    if (plano.nomenclatura_integracao == 'DES') {
                                                        //console.log("entrou no ACR")
                                                        delete response[chave].cd_emitente;
                                                        let mes2 = (plano.data_vencimento.getMonth() + 1);
                                                        let dia2 = plano.data_vencimento.getDate();
                                                        let ano2 = plano.data_vencimento.getFullYear();
                                                        let dataAjustada2 = `${ano2}-${mes2}-${dia2}`;
                                                        if (dataAjustada == dataAjustada2) {
                                                            let valorDerivacao = first.valor_lancamento;
                                                            let valorTotal = response[chave].valor_total;
                                                            let proporcao = valorDerivacao / valorTotal;
                                                            let valor1 = plano.valor_lancamento;
                                                            let desconto = valor1 * proporcao;
                                                            desconto_mov += desconto;
                                                        }
                                                    }
                                                });
                                                let arr = {
                                                    "fatura": response[chave].fatura,
                                                    "cliente": response[chave].cliente,
                                                    "num_arq_retorno": response[chave].num_arq_retorno,
                                                    "forma_pgto_liquidacao": response[chave].forma_pgto_liquidacao,
                                                    "obs_liquidacao": response[chave].obs_liquidacao,
                                                    "data_de_vencimento": response[chave].data_de_vencimento,
                                                    "valor_lancamento": converterParaReal(first.valor_lancamento),
                                                    "data_de_liquidação": response[chave].data_de_liquidação,
                                                    "serviço": servico,
                                                    "plano": response[chave].plano,
                                                    "valor_total": converterParaReal(response[chave].valor_total),
                                                    "valor_liquidado": converterParaReal(response[chave].valor_liquidado),
                                                    "valor_derivação": 0,
                                                    "acrescimo": acrescimo_mov,
                                                    "profile": response[chave].profile,
                                                    "usuario_lancamento":first.usuario_lancamento,
                                                    "cidade":first.cidade,
                                                    "emitente": emitente,
                                                    "desconto": desconto_mov,
                                                    "movimento": first.valor_lancamento
                                                }; 
                                                response.push(arr);
                                                contador2++;
                                                mov.push(first);
                                            }
                                        }
                                }
                            });
                            //Calcula acréscimos e descontos em cima do contrato + manual
                            valor.forEach(function (first, key) {
                                if (first.nomenclatura_integracao == 'ACR') {
                                    //console.log("entrou no ACR")
                                    let mes2 = (first.data_vencimento.getMonth() + 1);
                                    let dia2 = first.data_vencimento.getDate();
                                    let ano2 = first.data_vencimento.getFullYear();
                                    let dataAjustada2 = `${ano2}-${mes2}-${dia2}`;
                                    if (dataAjustada == dataAjustada2) {
                                        if(response[chave].manual=="0"){
                                            response[chave].manual = 0;
                                        }
                                        if(response[chave].movimento=="0"){
                                            response[chave].movimento = 0;
                                        }
                                        let valorDerivacao = (parseFloat(response[chave].valor_derivação)+response[chave].manual+response[chave].movimento);
                                        let valorTotal = response[chave].valor_total;
                                        let proporcao = valorDerivacao / valorTotal;
                                        let valor1 = first.valor_lancamento;
                                        let acrescimo = valor1 * proporcao;
                                        if(response[chave].acrescimo=="0"){
                                            response[chave].acrescimo = 0;
                                        }
                                        response[chave].acrescimo += acrescimo;
                                    }
                                }
                                if (first.nomenclatura_integracao == 'DES') {
                                    //console.log("entrou no ACR")
                                    delete response[chave].cd_emitente;
                                    let mes2 = (first.data_vencimento.getMonth() + 1);
                                    let dia2 = first.data_vencimento.getDate();
                                    let ano2 = first.data_vencimento.getFullYear();
                                    let dataAjustada2 = `${ano2}-${mes2}-${dia2}`;
                                    if (dataAjustada == dataAjustada2) {
                                        if(response[chave].manual=="0"){
                                            response[chave].manual = 0;
                                        }
                                        if(response[chave].movimento=="0"){
                                            response[chave].movimento = 0;
                                        }
                                        let valorDerivacao = (parseFloat(response[chave].valor_derivação)+response[chave].manual+response[chave].movimento);
                                        let valorTotal = response[chave].valor_total;
                                        let proporcao = valorDerivacao / valorTotal;
                                        let valor1 = first.valor_lancamento;
                                        let desconto = valor1 * proporcao;
                                        if(response[chave].desconto=="0"){
                                            response[chave].desconto = 0;
                                        }
                                        response[chave].desconto += desconto;
                                    }
                                }
                            })
                        }
                        else {
                            response[chave].acrescimo = 0;
                            delete response[chave].cd_emitente;
                        }
                        /*if(response[chave].acrescimo>0){
                            console.log(response[chave].valor_derivação);
                            console.log(response[chave].acrescimo);
                            console.log(parseFloat(response[chave].valor_derivação)+parseFloat(response[chave].acrescimo));
                        }*/
                        response[chave].total_a_receber = ((parseFloat(response[chave].valor_derivação)+parseFloat(response[chave].acrescimo)+parseFloat(response[chave].manual)+parseFloat(response[chave].movimento))+parseFloat(response[chave].desconto));
                        response[chave].total_a_receber = converterParaReal(response[chave].total_a_receber);
                        response[chave].valor_liquidado = converterParaReal(response[chave].valor_liquidado);
                        response[chave].valor_derivação = converterParaReal(response[chave].valor_derivação);
                        response[chave].valor_total = converterParaReal(response[chave].valor_total);
                        response[chave].valor_lancamento = converterParaReal(response[chave].valor_lancamento);
                        response[chave].acrescimo = converterParaReal(response[chave].acrescimo);
                        response[chave].desconto = converterParaReal(response[chave].desconto);
                        response[chave].manual = converterParaReal(response[chave].manual);
                        response[chave].movimento = converterParaReal(response[chave].movimento);
                        delete response[chave].cd_emitente;
                        if((chave+contador2) == (response.length-1)){
                            Array.prototype.push.apply(result,response);
                        }
                        if (((resprim.length - 1) == ind) && ((chave+contador2) == (response.length-1))) {
                            stringify(result, {
                                header: true,
                                delimiter: ";"
                            }, function (err, output) {
                                fs.writeFileSync('./csv' + '/arquivo.csv', output);
                                console.log("FIM");
                                enviarEmail.enviarEmailRelatorio();
                            })
                        }
                    })
                }else{
                    if(itm.valor_liquidado==0){
                        itm.valor_liquidado = itm.vlr_liquidacao;
                    }
                    var lista_manual = [];
                    var lista_acrescimo = [];
                    if (valor.length > 0) {
                        if(itm.num_arq_retorno>0){
                            itm.num_arq_retorno = "Retorno";
                        }else{
                            itm.num_arq_retorno = "Manual";
                        }
                        if(itm.forma_pgto_liquidacao > 0){
                            itm.forma_pgto_liquidacao = arquivo.tipoliquidacao(itm.forma_pgto_liquidacao )
                        }else{
                            itm.forma_pgto_liquidacao = "Manual";
                        }
                        valor.forEach(function (first, key) {
                            let servico= "";
                            let emitente= "";
                            if(first.unidade_financeira == "01.01.00")
                            {
                                servico = "Receita Visita Técnica";
                                emitente = "FLYSERVICE SERVICO DE TECNOLOGIA LTDA";
                            }else if(first.unidade_financeira == "01.00.01.03")
                            {
                                servico = "Receita Visita Técnica";
                                emitente = "FLYSERVICE SERVICO DE TECNOLOGIA LTDA";
                            }else{
                                emitente = first.unidade_financeira+"-"+first.unidade_financeira_descricao;
                            }
                            if(first.nomenclatura_integracao == 'MOV'){
                                temMov = false;
                                if(temMov==false){
                                    if(mov.indexOf(first) == -1)
                                    {
                                        let arr = {
                                            "fatura": itm.codfatura,
                                            "descricao_fatura":itm.descricao_fatura,
                                            "cliente": first.cliente,
                                            "num_arq_retorno": itm.num_arq_retorno,
                                            "forma_pgto_liquidacao": itm.forma_pgto_liquidacao,
                                            "obs_liquidacao": itm.obs_liquidacao,
                                            "data_de_vencimento": itm.data_de_vencimento,
                                            "valor_lancamento": converterParaReal(first.valor_lancamento),
                                            "data_de_liquidação": itm.data_de_liquidação,
                                            "serviço": servico,
                                            "usuario_lancamento":first.usuario_lancamento,
                                            "cidade":first.cidade,
                                            "plano": itm.descricao_fatura,
                                            "valor_total": converterParaReal(itm.valor_total_original),
                                            "valor_derivação": 0,
                                            "acrescimo": 0,
                                            "desconto": 0,
                                            "total_a_receber":first.valor_lancamento,
                                            "emitente": emitente,
                                            "movimento":first.valor_lancamento
                                        }; 
                                        response.push(arr);
                                        mov.push(first);
                                    }
                                }
                            }
                            if(first.nomenclatura_integracao == 'MAN'){
                                let arr = {
                                    "fatura": itm.codfatura,
                                    "descricao_fatura":itm.descricao_fatura,
                                    "cliente": first.cliente,
                                    "num_arq_retorno": itm.num_arq_retorno,
                                    "forma_pgto_liquidacao": itm.forma_pgto_liquidacao,
                                    "obs_liquidacao": itm.obs_liquidacao,
                                    "data_de_vencimento": itm.data_de_vencimento,
                                    "valor_lancamento": converterParaReal(first.valor_lancamento),
                                    "data_de_liquidação": itm.data_de_liquidação,
                                    "serviço": first.descricao_conta,
                                    "plano": itm.descricao_fatura,
                                    "valor_total": converterParaReal(itm.valor_total_original),
                                    "valor_liquidado": converterParaReal(itm.valor_liquidado),
                                    "valor_derivação": 0,
                                    "acrescimo": 0,
                                    "profile": '',
                                    "emitente":emitente,
                                    "usuario_lancamento":first.usuario_lancamento,
                                    "cidade":first.cidade,
                                    "desconto": 0,
                                    "movimento": 0,
                                    "total_a_receber":0,
                                    "manual": first.valor_lancamento
                                }; 
                                response.push(arr);
                                lista_manual.push(arr);
                            }
                            if(first.nomenclatura_integracao == 'ACR'){
                                lista_acrescimo.push(first);
                            }
                        })
                        Array.prototype.push.apply(result,response);
                        if(lista_manual.length>0){
                            lista_manual.forEach(function (manual, manual_key) {
                                var result_key = result.indexOf(manual);
                                if(result_key>-1){
                                    if(lista_acrescimo.length>0){
                                        lista_acrescimo.forEach(function (acrescimo, acrescimo_key){
                                            let valorLancamento = parseFloat(result[result_key].manual);
                                            let valorTotal = itm.valor_total_original;
                                            let proporcao = valorLancamento / valorTotal;
                                            let valor1 = acrescimo.valor_lancamento;
                                            let acrescimo_valor = valor1 * proporcao;
                                            if(result[result_key].acrescimo=="0"){
                                                result[result_key].acrescimo = 0;
                                            }
                                            result[result_key].acrescimo += acrescimo_valor;
                                        });
                                    }
                                }
                                result[result_key].total_a_receber = ((result[result_key].valor_derivação+result[result_key].acrescimo+result[result_key].manual+result[result_key].movimento)+result[result_key].desconto);
                                result[result_key].total_a_receber = converterParaReal(result[result_key].total_a_receber);
                                result[result_key].acrescimo = converterParaReal(result[result_key].acrescimo);
                                result[result_key].manual = converterParaReal(result[result_key].manual);
                            });
                        }
                    }
                    if ((resprim.length - 1) == ind) {
                        stringify(result, {
                            header: true,
                            delimiter: ";"
                        }, function (err, output) {
                            fs.writeFileSync('./csv' + '/arquivo.csv', output);
                            console.log("FIM");
                            enviarEmail.enviarEmailRelatorio();
                        })
                    }
                }
            })
        })
    });
})


app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})