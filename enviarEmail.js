var nodemailer = require('nodemailer');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);
const { createReadStream, createWriteStream } = require('fs');
const fs = require('fs');


module.exports = {
    enviarEmailRelatorio: () => {
        async function do_gzip(input, output) {
            const gzip = createGzip();
            const source = createReadStream(input);
            const destination = createWriteStream(output);
            await pipe(source, gzip, destination);
          }
          var transporte = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              user: '',
              pass: ''
            }
          });
          
          do_gzip('./csv/arquivo.csv', './csv/arquivo.csv.gz')
          .then(() => {
            
            var email = {
              from: '',
              to: '',
              subject: 'Relatório Financeiro Contas a Receber',
              html: 'Olá, segue em anexo o relatório solicitado!',
              attachments: [{
                filename: 'arquivo.csv.gz',
                path: './csv/arquivo.csv.gz'
              }]
            };
            transporte.sendMail(email, function (err, info) {
              if (err)
              throw err;
              console.log('Email enviado! Leia as informações adicionais: ', info);
              var filePath = './csv/arquivo.csv';
              var filePath2 = './csv/arquivo.csv.gz' 
              fs.unlinkSync(filePath);
              fs.unlinkSync(filePath2);
              });
            })
            .catch((err) => {
              console.error('An error occurred:', err);
              process.exitCode = 1;
            });
    },
    enviarEmailRelatorioContasPagar: () => {
      async function do_gzip(input, output) {
          const gzip = createGzip();
          const source = createReadStream(input);
          const destination = createWriteStream(output);
          await pipe(source, gzip, destination);
        }
        var transporte = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: 'dev@flybyte.com.br',
            pass: 'flylvtdesenvolvimento'
          }
        });
        
        do_gzip('./csv/contas_pagar.csv', './csv/contas_pagar.csv.gz')
        .then(() => {
          
          var email = {
            from: '',
            to: '',
            subject: 'Relatório Financeiro Contas a Pagar',
            html: 'Olá, segue em anexo o relatório solicitado!',
            attachments: [{
              filename: 'contas_pagar.csv.gz',
              path: './csv/contas_pagar.csv.gz'
            }]
          };
          transporte.sendMail(email, function (err, info) {
            if (err)
            throw err;
            console.log('Email enviado! Leia as informações adicionais: ', info);
            var filePath = './csv/contas_pagar.csv';
            var filePath2 = './csv/contas_pagar.csv.gz' 
            fs.unlinkSync(filePath);
            fs.unlinkSync(filePath2);
            });
          })
          .catch((err) => {
            console.error('An error occurred:', err);
            process.exitCode = 1;
          });
  },
}
