'use strict';

var JsonApiQueryParser = require('../src/JsonApiQueryParser');
var chai = require('chai');
var should = chai.should();
var expect = chai.expect;

describe('JsonApiQueryParser', function () {

  var requestData;
  var requestDataSubset;

  beforeEach(function () {
    requestData = {
      resourceType: null,
      identifier: null,
      relationships: false,
      relationshipType: null,
      queryData: {
        include: [],
        fields: {},
        sort: [],
        page: {},
        search: {},
        filter: {},
      }
    };

    requestDataSubset = {
      include: [],
      fields: {},
      sort: [],
      page: {},
      search: {},
      filter: {},
    };
  });

  afterEach(function () {
    requestData = null;
    requestDataSubset = null;
  });


  describe('parseRequest function', function() {
    it('should parse the whole given request.url by splitting it and calling parseEndpoint and parseQueryParameters', function() {
      var testString, testData, expectedData;
      var parserClass = new JsonApiQueryParser();

      testString = '//article/5/relationships/comment?include=user,testComment&sort=Age%2CfirstName&&fields[user]=name,email&page[limit]=20'
                    + '&filter[name]=john%20doe&filter[age]=15&filter[name][like]=john,joe&filter[age][not]=30&filter[age][gt]=17';
      testData = parserClass.parseRequest(testString, requestData);

      expectedData = {
        resourceType: 'article',
        identifier: '5',
        relationships: true,
        relationshipType: 'comment',
        queryData: {
          include: ['user', 'testComment'],
          sort: ['Age', 'firstName'],
          fields: {
            user: ['name', 'email']
          },
          page: {
            limit: '20'
          },
          search: {},
          filter: {
            age: {
              eq: '15',
              not: '30',
              gt: '17'
            },
            name: {
              eq: 'john doe',
              like: 'john,joe'
            },
          }
        }
      };

      expect(testData).to.deep.equal(expectedData);
    });
  });

  describe('parseEndpoint function', function() {
    it('should parse the correct splits to each requestData definition.', function() {
      var testString, testData, expectedData;
      var parserClass = new JsonApiQueryParser();

      testString = 'article/5/relationships/comment';
      testData = parserClass.parseEndpoint(testString, requestData);

      expectedData = {
        resourceType: 'article',
        identifier: '5',
        relationships: true,
        relationshipType: 'comment',
        queryData: {
          include: [],
          fields: {},
          sort: [],
          page: {},
          search: {},
          filter: {}
        }
      };

      expect(testData).to.deep.equal(expectedData);

      testString = '//article/5/comment//';
      testData = parserClass.parseEndpoint(testString, requestData);

      expectedData = {
        resourceType: 'article',
        identifier: '5',
        relationships: false,
        relationshipType: 'comment',
        queryData: {
          include: [],
          fields: {},
          sort: [],
          page: {},
          search: {},
          filter: {}
        }
      };

      expect(testData).to.deep.equal(expectedData);

    });

    it('should throw a ReferenceError if the request asked for /relationships but did not define the name of it.', function() {
      var testString;
      var parserClass = new JsonApiQueryParser();

      testString = 'article/5/relationships/';
      var testFunction = function() {
        parserClass.parseEndpoint(testString, requestData);
      };

      expect(testFunction).to.throw(ReferenceError);

    });
  });

  describe('parseQueryParameters/delegateToParser function', function() {
    it('should split the query into pieces and delegate them to their matching parser function.', function() {

      var testString, testData, expectedData;
      var parserClass = new JsonApiQueryParser();

      testString = 'include=user,comment&sort=age&fields[user]=name,email&page[limit]=20&filter[name]=test';
      testData = parserClass.parseQueryParameters(testString, requestDataSubset);

      expectedData = {
        include: ['user', 'comment'],
        fields: {
          user: ['name', 'email']
        },
        sort: ['age'],
        page: {
          limit: '20'
        },
        search: {},
        filter: {
          name: { eq: 'test' },
        }
      };

      expect(testData).to.deep.equal(expectedData);

      requestDataSubset = {
        include: [],
        fields: {},
        sort: [],
        page: {},
        search: {},
        filter: {}
      };

      testString = '&&include=user&page[offset]=200&sort=age,-id&fields[user]=name,email&&fields[article]=title,body&page[limit]=20'
                    + '&filter[name]=test&filter[lastname]=another&filter[like][name]=boo';
      testData = parserClass.parseQueryParameters(testString, requestDataSubset);

      expectedData = {
        include: ['user'],
        fields: {
          user: ['name', 'email'],
          article: ['title', 'body']
        },
        sort: ['age', '-id'],
        page: {
          offset: '200',
          limit: '20'
        },
        search: {},
        filter: {
          name: { eq: 'test' },
          lastname: { eq: 'another' },
          like: {
            name: 'boo'
          },
        }
      };

      expect(testData).to.deep.equal(expectedData);
    });
  });

  describe('parseInclude function', function() {
    it('should push the values of the include string to the queryData include array.', function() {
      let includeString = 'include=user,comment.user';

      let testData = JsonApiQueryParser.parseInclude(includeString, requestDataSubset);
      let expectedData = {
        include: ['user', 'comment.user'],
        fields: {},
        sort: [],
        page: {},
        search: {},
        filter: {}
      };

      expect(testData).to.deep.equal(expectedData);
    });
  });

  describe('parseFields function', function() {
    it('should push the values of the fields strings to their matching queryData field objects.', function() {
      let fieldsStrings = [
        'fields[article]=title,body',
        'fields[comment]=body,createdon',
        'fields[rating]=stars'
      ];

      let testData = requestDataSubset;
      fieldsStrings.forEach(function(fieldsString) {
        testData = JsonApiQueryParser.parseFields(fieldsString, testData);
      });

      let expectedData = {
        include: [],
        fields: {
          article: ['title', 'body'],
          comment: ['body', 'createdon'],
          rating: ['stars']
        },
        sort: [],
        page: {},
        search: {},
        filter: { }
      };

      expect(testData).to.deep.equal(expectedData);
    });
  });

  describe('parsePage function', function() {
    it('should push the values of the page strings to their matching queryData page objects.', function() {
      let pageStrings = [
        'page[limit]=20',
        'page[offset]=180'
      ];

      let testData = requestDataSubset;
      pageStrings.forEach(function(pageString) {
        testData = JsonApiQueryParser.parsePage(pageString, testData);
      });

      let expectedData = {
        include: [],
        fields: {},
        sort: [],
        page: {
          limit: '20',
          offset: '180'
        },
        search: {},
        filter: {}
      };

      expect(testData).to.deep.equal(expectedData);
    });
  });

  describe('parseSort function', function() {
    it('should push the values of the sort string to the queryData sort array.', function() {
      let sortString = 'sort=-createdon,type';

      let testData = JsonApiQueryParser.parseSort(sortString, requestDataSubset);
      let expectedData = {
        include: [],
        fields: {},
        sort: ['-createdon', 'type'],
        page: {},
        search: {},
        filter: {}
      };

      expect(testData).to.deep.equal(expectedData);
    });
  });

  describe('parseFilter function', function() {
    it('should place the values of the filter strings to their matching queryData filter objects.', function() {
      let filterString = 'filter[id]=5';

      let testData = JsonApiQueryParser.parseFilter(filterString, requestDataSubset);
      let expectedData = {
        include: [],
        fields: {},
        sort: [],
        page: {},
        search: {},
        filter: {
          id: { eq: '5' },
        }
      };

      expect(testData).to.deep.equal(expectedData);

      let filterString2 = 'filter[name]=john doe';
      let testData2 = JsonApiQueryParser.parseFilter(filterString2, testData);
      let expectedData2 = {
        include: [],
        fields: {},
        sort: [],
        page: {},
        search: {},
        filter: {
          id: { eq: '5' },
          name: { eq: 'john doe' },
        }
      };
      expect(testData2).to.deep.equal(expectedData2);
    });
  });

  describe('parseFilterType function', function() {
    it('should place the values of the filterType strings to their matching queryData filterType objects.', function() {
      let filterString = 'filter[name][not]=jack';

      let testData = JsonApiQueryParser.parseFilterType(filterString, requestDataSubset);
      let expectedData = {
        include: [],
        fields: {},
        sort: [],
        page: {},
        search: {},
        filter: {
          name: {
            not: 'jack'
          }
        }
      };

      expect(testData).to.deep.equal(expectedData);

      let filterString2 = 'filter[age][lt]=24';
      let testData2 = JsonApiQueryParser.parseFilterType(filterString2, testData);
      let expectedData2 = {
        include: [],
        fields: {},
        sort: [],
        page: {},
        search: {},
        filter: {
          name: {
            not: 'jack'
          },
          age: {
            lt: '24'
          }
        }
      };
      expect(testData2).to.deep.equal(expectedData2);
    });
  });

  describe('trimSlashes function', function() {
    it('should trim leading and trailing slashes recursively.', function() {
      let testString = '//article/5//';
      let expectedString = 'article/5';
      let result = JsonApiQueryParser.trimSlashes(testString);
      expect(result).to.equal(expectedString);

      testString = '/article/5/comments';
      expectedString = 'article/5/comments';
      result = JsonApiQueryParser.trimSlashes(testString);
      expect(result).to.equal(expectedString);

      testString = 'article/5/';
      expectedString = 'article/5';
      result = JsonApiQueryParser.trimSlashes(testString);
      expect(result).to.equal(expectedString)
    });
  });
});

