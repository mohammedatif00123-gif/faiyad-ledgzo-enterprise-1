/**
 * Base Repository for common MongoDB operations
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async findById(id, select = '') {
    return await this.model.findById(id).select(select);
  }

  async findOne(query, select = '') {
    return await this.model.findOne(query).select(select);
  }

  async find(query = {}, select = '', sort = {}) {
    return await this.model.find(query).select(select).sort(sort);
  }

  async updateById(id, data) {
    return await this.model.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true
    });
  }

  async deleteById(id) {
    return await this.model.findByIdAndDelete(id);
  }
  
  async count(query = {}) {
    return await this.model.countDocuments(query);
  }
}

module.exports = BaseRepository;
