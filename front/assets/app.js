$(document).ready(function(){

    $body = $("body");

    function download(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        
        element.style.display = 'none';
        document.body.appendChild(element);
        
        element.click();
        
        document.body.removeChild(element);
    }

    $('#get_result').click(function(){
        $body.addClass("loading");
        var dados = {
            'data_inicial':$('#data_inicial').val(),
            'data_final':$('#data_final').val()
        }
        var url = "";
        if($('#tipo').val()=="receber"){
            url = 'http://186.250.8.83:3000/contas'
        }else if($('#tipo').val()=="pagar"){
            url = 'http://186.250.8.83:3000/contas_pagar'
        }
        if(url!=""){
            $.ajax({
                url:url,
                type:'post',
                data: JSON.stringify(dados),
                processData : false,
                contentType: 'application/json; charset=utf-8',
                success: function(response){
                    console.log('ok');
                    //download(response.nome, response.arquivo);
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                $body.removeClass("loading");
                console.log(XMLHttpRequest);
                }
            })
            $('#message-alert').removeClass('message-show-alert');
            $('#message-alert').addClass('message-not-show');
            $('#message').removeClass('message-not-show');
            $('#message').addClass('message-show');
        }else{
            $('#message').removeClass('message-show');
            $('#message').addClass('message-not-show');
            $('#message-alert').removeClass('message-not-show');
            $('#message-alert').addClass('message-show-alert');
        }
        $body.removeClass("loading");
    })
})