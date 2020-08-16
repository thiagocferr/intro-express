# Intro ao Express

Esse é um repositório para treinar o uso de Javascript, NodeJS e a o _framework_ Express. Foi feito na matéria **MAC0475 - Laboratório de Sistemas Computacionais Complexos** como terceiro exercício-programa da disciplina e utiliza como base o conteúdo do [repositório de um dos monitores](https://gitlab.com/jotaf.daniel/intro-express).

Basicamente, essa aplicação serve para criar notas de texto, que podem ser separadas por projetos e blocos de notas

# Uso

Repositório dockerizado. para rodar

```bash
# constrói a imagem
docker-compose build

# roda em modo 'development'
docker-compose up
```

Para rodar os testes

```
docker-compose run server yarn test [--watchAll]
```

> `--watchAll` observa seu código por alterações e, quando elas acontecerem, roda a bateria de testes novamente
